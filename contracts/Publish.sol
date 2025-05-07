// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PublishRegistry is ReentrancyGuard, Ownable{

  mapping(address => uint) public balances;
  mapping(bytes32 => uint) public bookEarnings;
  mapping(address => bool) public authorizedAccounts; // accounts authorized to make certain calls
  mapping(address => uint) public authorNonces;

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
  mapping(bytes32 => bool) public isDeleted;

  event BookRegistered(bytes32 indexed bookId, string title, string author, address author_addr, string ipfsHash, uint price); 
  event BookUpdated(bytes32 indexed bookId, string newTitle, string newIpfsHash, uint newPrice);
  event BookGifted(bytes32 indexed bookId, address indexed sender, address indexed recipient);
  event RefundFailed(address indexed buyer, uint256 amount);
  event BookPurchased(bytes32 indexed bookId, address indexed buyer);
  event AuthorizedAccountAdded(address indexed account);
  event AuthorizedAccountRemoved(address indexed account);
  event BookDeleted(bytes32 indexed bookId);


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
  function addAuthorizedAccount(address account) external onlyAuthorized {
    authorizedAccounts[account] = true;
    emit AuthorizedAccountAdded(account);
  }

  /**
    @notice Modifying the accounts that are authorized to make certain calls
    @param account: Address authorized to make certain calls
  */
  function removeAuthorizedAccount(address account) external onlyAuthorized {
    authorizedAccounts[account] = false;
    emit AuthorizedAccountRemoved(account);
  }

  /**
    @notice Registers the book information on the blockchain
    @param _title: Title of the book
    @param _author: Public name of the author of the book
    @param _ipfsHash: IPFS hash of the book 
    @param _price: Price of the book
   */
  function publishBook(
    string memory _title, 
    string memory _author, 
    string memory _ipfsHash, 
    uint _price
  ) external{

    require(bytes(_title).length > 0, "Title cannot be empty");
    require(bytes(_author).length > 0, "Author cannot be empty");
    require(bytes(_ipfsHash).length > 0, "IPFS Hash cannot be empty");  

    uint nonce = authorNonces[msg.sender]++;
    bytes32 bookId = keccak256(abi.encodePacked(msg.sender, nonce));

    books[bookId] = Book({
      title: _title,
      author: _author,
      author_addr: msg.sender,
      ipfsHash: _ipfsHash, 
      timestamp: block.timestamp, 
      price: _price
    });

    bookOwners[bookId] = msg.sender;
    emit BookRegistered(bookId, _title, _author, msg.sender, _ipfsHash, _price); 
  }

  /**
    @notice Registers the book information on the blockchain
    @param _title: Title of the book
    @param _author: Public name of the author of the book
    @param _ipfsHash: IPFS hash of the book 
    @param _price: Price of the book
    @param author_addr: Address of the author
  */
  function publishBookFor( 
    string memory _title, 
    string memory _author, 
    string memory _ipfsHash, 
    uint _price,
    address author_addr
  ) external onlyAuthorized {
    require(bytes(_title).length > 0, "Title cannot be empty");
    require(bytes(_author).length > 0, "Author cannot be empty");
    require(bytes(_ipfsHash).length > 0, "IPFS Hash cannot be empty");  
    require(author_addr != address(0), "Author has to have an address"); 

    uint nonce = authorNonces[author_addr]++;
    bytes32 bookId = keccak256(abi.encodePacked(author_addr, nonce));

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
   */
  function purchaseBook(bytes32 _bookId) external payable{
    require(bookOwners[_bookId] != address(0), "Book does not exist");
    require(!purchasers[_bookId][msg.sender], "Book already purchased by this address");

    Book memory book = books[_bookId]; 
    require(book.price <= msg.value, "Funds too low");

    // Calculate excess funds
    uint excess = msg.value - book.price;

    // Update the balance for the book author
    balances[book.author_addr] += book.price;
    bookEarnings[_bookId] += book.price;

    purchasers[_bookId][msg.sender] = true;

     // Refund excess funds to the buyer
    if (excess > 0) {
        (bool success, ) = payable(msg.sender).call{value: excess}("");
        if (!success) {
              emit RefundFailed(msg.sender, excess);
        }
    }

    emit BookPurchased(_bookId, msg.sender);
  }


  /**
    @notice Function allows users to gift books
    @param _bookId: bookId
    @param recipient: person to be gifted the book
   */
  function giftBook(bytes32 _bookId, address recipient) external payable {
    require(bookOwners[_bookId] != address(0), "Book does not exist");
    require(recipient != msg.sender, "Cannot gift to yourself");
    require(recipient != address(0), "Invalid recipient");
    require(!purchasers[_bookId][recipient], "Recipient already owns this book");

    Book memory book = books[_bookId];
    require(msg.value >= book.price, "Insufficient funds to gift");

    uint excess = msg.value - book.price;

    // Record purchase for the recipient
    balances[book.author_addr] += book.price;
    bookEarnings[_bookId] += book.price;

    purchasers[_bookId][recipient] = true;

    // Refund any excess to the sender
    if (excess > 0) {
        payable(msg.sender).transfer(excess);
    }
    emit BookGifted(_bookId, msg.sender, recipient);
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
  function getBook(bytes32 _bookId) external view returns(string memory, string memory, address, string memory, uint, uint) {
    Book memory book = books[_bookId]; 
    return (book.title, book.author, book.author_addr, book.ipfsHash, book.timestamp, book.price);
  }

   /**
    @notice Checks to see if address passed bought the book
    @param _bookId: bookId
    @param user: address of the user being passed
    @return bool: returns boolean whether address owns the book or not
   */
  function checkPurchaser(bytes32 _bookId, address user) external view returns(bool){
    if (isDeleted[_bookId]) return false;
    return purchasers[_bookId][user];
  }

  /**
    @notice To delete the book info
    @param _bookId: bookId
  */
  function deleteBook(bytes32 _bookId) external {
    require(bookOwners[_bookId] != address(0), "Book owner does not exist");
    require(bookOwners[_bookId] == msg.sender, "Only author is authorized to delete this book");

    delete books[_bookId]; 
    delete bookOwners[_bookId];
    isDeleted[_bookId] = true; // soft delete

    emit BookDeleted(_bookId);
  }

  /**
    @notice To delete the book info
    @param _bookId: bookId
    @param author_addr: author of the book
  */
  function deleteBookFor(
    bytes32 _bookId,
    address author_addr
  ) external onlyAuthorized {
    require(bookOwners[_bookId] != address(0), "Book owner does not exist");
    require(bookOwners[_bookId] == author_addr, "Only author is authorized to delete this book");

    delete books[_bookId]; 
    delete bookOwners[_bookId];
    isDeleted[_bookId] = true; // soft delete

    emit BookDeleted(_bookId);
  }

  /**
    @notice To update the book information 
    @param _bookId: bookId
    @param _newTitle: the updated title of the book being passed
    @param _newIpfsHash: the updated ipfsHash of the book
  */
  function updateBookInfo(
    bytes32 _bookId,
    string memory _newTitle, 
    string memory _newIpfsHash, 
    uint _newPrice
  ) external {
      require(bookOwners[_bookId] != address(0), "Book owner does not exist");
      require(bookOwners[_bookId] == msg.sender, "Only the author can update the book");
      require(bytes(_newTitle).length > 0, "Title cannot be empty");
      require(bytes(_newIpfsHash).length > 0, "IPFS Hash cannot be empty");

      Book storage book = books[_bookId]; // ✅ now modifies storage directly
      book.title = _newTitle;
      book.ipfsHash = _newIpfsHash;
      book.price = _newPrice;

      emit BookUpdated(_bookId, _newTitle, _newIpfsHash, _newPrice);
  }

  /**
    @notice To update the book information 
    @param _bookId: bookId
    @param _newTitle: the updated title of the book being passed
    @param _newIpfsHash: the updated ipfsHash of the book
  */
  function updateBookInfoFor(
    bytes32 _bookId,
    string memory _newTitle, 
    string memory _newIpfsHash, 
    uint _newPrice,
    address author_addr
  ) external onlyAuthorized {
      require(bookOwners[_bookId] != address(0), "Book owner does not exist");
      require(bookOwners[_bookId] == author_addr, "Only the author can update the book");
      require(bytes(_newTitle).length > 0, "Title cannot be empty");
      require(bytes(_newIpfsHash).length > 0, "IPFS Hash cannot be empty");

      Book storage book = books[_bookId]; // ✅ now modifies storage directly
      book.title = _newTitle;
      book.ipfsHash = _newIpfsHash;
      book.price = _newPrice;

      emit BookUpdated(_bookId, _newTitle, _newIpfsHash, _newPrice);

  }

  /**
    @notice Returns the total amount earned from a specific book
    @param _bookId: ID of the book
    @return uint: Total earnings in wei
  */
  function getBookEarnings(bytes32 _bookId) external view returns (uint) {
      require(bookOwners[_bookId] == msg.sender, "Not the author");
      return bookEarnings[_bookId];
  }

}