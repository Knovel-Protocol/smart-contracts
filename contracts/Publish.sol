// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PublishRegistry is ReentrancyGuard, Ownable{

  mapping(address => uint) public balances;
  mapping(address => bool) public authorizedAccounts; // accounts authorized to make certain calls

  error UnauthorizedAccess(address account);


  // Book metadata storage
  struct Book {
    string title; 
    string author;
    address author_addr;
    string ipfsHash; 
    uint256 timestamp;
    uint price;        
  }

  mapping(bytes32 => Book) public books; 
  mapping(bytes32 => address) public bookOwners;
  mapping(bytes32 => mapping(address => bool)) public purchasers; 

  event BookRegistered(bytes32 indexed bookId, string title, string author, address author_addr, string ipfsHash, uint price); 
  event BookUpdated(bytes32 indexed bookId, string newTitle, string newIpfsHash, uint newPrice);

  constructor()
    Ownable(msg.sender){
      authorizedAccounts[msg.sender] = true;
  }


  modifier onlyAuthorized() {
     if (!authorizedAccounts[msg.sender]) {
        revert UnauthorizedAccess(msg.sender);
      }
      _;
  }


  /**
    @notice Accounts that are authorized to make certain calls
    @param account: Address authorized to make certain calls
   */
  function addAuthorizedAccount(address account) external onlyOwner {
      authorizedAccounts[account] = true;
  }

  /**
    @notice Removing authorized accounts 
    @param account: Account to be removed
   */
  function removeAuthorizedAccount(address account) external onlyOwner {
    require(account != owner(), "Owner cannot remove their own authorization");
    authorizedAccounts[account] = false;
  }

  /**
    @notice Accounts that are authorized to make certain calls
    @param account: Address authorized to make certain calls
  */
  function isThirdwebAccount(address account) internal view returns (bool) {
      return authorizedAccounts[account];
  }

  /**
    @notice Registers the book information on the blockchain
    @param _title: Title of the book
    @param _author: Public name of the author of the book
    @param author_addr: Address of the author of the book
    @param _ipfsHash: IPFS hash of the book 
    @param _price: Price of the book
   */
  function publishBook(
    string memory _title, 
    string memory _author, 
    string memory _ipfsHash, 
    address author_addr,
    uint _price
  ) external {

    require(bytes(_title).length > 0, "Title cannot be empty");
    require(bytes(_author).length > 0, "Author cannot be empty");
    require(bytes(_ipfsHash).length > 0, "IPFS Hash cannot be empty");  

    bytes32 bookId = keccak256(abi.encodePacked(_title, _author, _ipfsHash, _price, block.timestamp)); 
    require(bookOwners[bookId] == address(0), "Book already registered"); 

    books[bookId] = Book({
      title: _title,
      author: _author,
      author_addr: author_addr,
      ipfsHash: _ipfsHash, 
      timestamp: block.timestamp, 
      price: _price
    });

    bookOwners[bookId] = author_addr;
    emit BookRegistered(bookId, _title, _author, author_addr, _ipfsHash, _price); 
  }

  /**
    @notice Function allows users to purchase books
    @param _bookId: bookId
    @param buyer_addr: address of the buyer of the book 
   */
  function purchaseBook(bytes32 _bookId, address buyer_addr) external payable{
    require(!purchasers[_bookId][buyer_addr], "Book already purchased by this address");

    Book memory book = books[_bookId]; 
    require(book.price <= msg.value, "Funds to low");

    // Calculate excess funds
    uint excess = msg.value - book.price;

    // Update the balance for the book author
    balances[book.author_addr] += book.price;
    purchasers[_bookId][buyer_addr] = true;

     // Refund excess funds to the buyer
    if (excess > 0) {
        payable(buyer_addr).transfer(excess);
    }
  }

  /**
    @notice Lets the author withdraw funds for book sales
    @param author_addr: address of the book 
   */
  function withdrawFunds(address author_addr) external nonReentrant onlyAuthorized{
    uint amount = balances[author_addr];
    require(amount > 0, "No funds to withdraw");
    
    // Reset the balance before transferring funds
    balances[author_addr] = 0;

    // Interaction: transfer funds to the author
    payable(author_addr).transfer(amount);
  }

  /**
    @notice This returns the book information
    @param _bookId: bookId
    @return string: returns the book title
    @return string: returns the book author
    @return string: returns the ipfs hash
    @return uint: returns the timestamp

   */
  function getBook(bytes32 _bookId) external view returns(string memory, string memory, string memory, uint, uint) {
    Book memory book = books[_bookId]; 
    return (book.title, book.author, book.ipfsHash, book.timestamp, book.price);
  }

   /**
    @notice Checks to see if address passed bought the book
    @param _bookId: bookId
    @param user: address of the user being passed
    @return bool: returns boolean whether address owns the book or not
   */
  function checkPurchaser(bytes32 _bookId, address user) external view returns(bool){
    return purchasers[_bookId][user];
  }

  /**
    @notice To delete the book info
    @param _bookId: bookId
    @param author_addr: author of the book
  */
  function deleteBook(bytes32 _bookId, address author_addr) external onlyAuthorized{
    require(bookOwners[_bookId] != address(0), "Book owner does not exist");
    require(bookOwners[_bookId] == author_addr, "Only author is authorized to delete this book");

    delete books[_bookId]; 
    delete bookOwners[_bookId];

  }

  /**
    @notice To update the book information 
    @param _bookId: bookId
    @param _newTitle: the updated title of the book being passed
    @param author_addr: address of the author
    @param _newIpfsHash: the updated ipfsHash of the book
  */
  function updateBookInfo(
    bytes32 _bookId,
    string memory _newTitle, 
    string memory _newIpfsHash, 
    address author_addr,
    uint _newPrice
  ) external onlyAuthorized{
      require(bookOwners[_bookId] != address(0), "Book owner does not exist");
      require(bookOwners[_bookId] == author_addr, "Only the author can update the book");
      require(bytes(_newTitle).length > 0, "Title cannot be empty");
      require(bytes(_newIpfsHash).length > 0, "IPFS Hash cannot be empty");

      Book memory book = books[_bookId];
      book.title = _newTitle;
      book.ipfsHash = _newIpfsHash;
      book.price = _newPrice;

      emit BookUpdated(_bookId, _newTitle, _newIpfsHash, _newPrice);
  }

}