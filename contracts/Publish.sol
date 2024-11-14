// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract PublishRegistry {

  mapping(address => uint) public balances;

  // Book metadata storage
  struct Book {
    string title; 
    string author;
    address author_addr;
    string ipfsHash; 
    uint256 timestamp;
    uint price;         // 0 if free
  }

  mapping(bytes32 => Book) public books; 
  mapping(bytes32 => address) public bookOwners;
  mapping(bytes32 => mapping(address => bool)) public purchasers; 

  event BookRegistered(bytes32 indexed bookId, string title, string author, address author_addr, string ipfsHash, uint price); 

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
  ) external {

    require(bytes(_title).length > 0, "Title cannot be empty");
    require(bytes(_author).length > 0, "Author cannot be empty");
    require(bytes(_ipfsHash).length > 0, "IPFS Hash cannot be empty");  

    bytes32 bookId = keccak256(abi.encodePacked(_title, _author, _ipfsHash, _price, block.timestamp)); 
    require(bookOwners[bookId] == address(0), "Book already registered"); 

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
    @notice Function allows users to purchase books
    @param _bookId: bookId
   */
  function purchaseBook(bytes32 _bookId) external payable{
    Book memory book = books[_bookId]; 
    require(book.price <= msg.value, "Funds to low");

    // Update the balance for the book author
    balances[book.author_addr] += msg.value;

    purchasers[_bookId][msg.sender] = true;
  }

  /**
    @notice Lets the author withdraw funds for book sales
   */
  function withdrawFunds() external {
    uint amount = balances[msg.sender];
    require(amount > 0, "No funds to withdraw");
    
    // Reset the balance before transferring funds
    balances[msg.sender] = 0;

    // Interaction: transfer funds to the author
    payable(msg.sender).transfer(amount);
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

}