import hre from "hardhat";
import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { getAddress, parseEther } from "viem";
import { author_name, bookTitle, giftBook, hash, publishBook, publishBookFor, purchaseBook } from "./utils/helpers";


describe("Publish", function() {
  async function deployPublish() {

    // Contracts are deployed using the first signer/account by default
    const [authorizer, author, purchaser, giftee] = await hre.viem.getWalletClients();

    const publish = await hre.viem.deployContract("PublishRegistry");
    const publicClient = await hre.viem.getPublicClient();

    // Fund the owner with 10 Ether for testing purposes
    // await hre.network.provider.send("hardhat_setBalance", [
    //   owner.account.address,
    //   "0x8AC7230489E80000" 
    // ])
     
    return {
      publish,
      author,
      purchaser,
      giftee,
      authorizer,
      publicClient,
    };
  }

  describe("Deployment", function () {
    it("User should publish a book", async function() {
      const { publish, authorizer } = await loadFixture(deployPublish);
      const author_addr = getAddress(authorizer.account.address);

      const {bookAuthor, title, authorName, ipfsHash} = await publishBook(publish);

      expect(bookAuthor).to.equal(author_addr);
      
      expect(title).to.equal(bookTitle);
      expect(authorName).to.equal(author_name);
      expect(ipfsHash).to.equal(hash);
    });

    it("Authorizer should publish book on behalf of the author", async function() {
      const { publish, author } = await loadFixture(deployPublish);

      const {bookAuthor_addr, title, authorName, publisher_addr, ipfsHash} = await publishBookFor(publish, author.account.address);

      expect(bookAuthor_addr).to.equal(getAddress(author.account.address));
      expect(publisher_addr).to.equal(getAddress(author.account.address));
      
      expect(title).to.equal(bookTitle);
      expect(authorName).to.equal(author_name);
      expect(ipfsHash).to.equal(hash);
    });

    it("Should allow users to be able to purchase a book", async function () {
      const { publish, purchaser, publicClient } = await loadFixture(deployPublish);

      const balanceBefore = await publicClient.getBalance({
        address: publish.address,
      })

      const {bookId} = await publishBook(publish);
      const {isPurchased, balanceAfter} = await purchaseBook(publish, bookId, purchaser, publicClient);

      expect(isPurchased).to.equal(true);  
      expect(balanceAfter - balanceBefore).to.equal(parseEther("1"))   
    })

    it("Should allow users to gift books to another user", async function () {
      const { publish, purchaser, publicClient, giftee } = await loadFixture(deployPublish);

      const balanceBefore = await publicClient.getBalance({
        address: publish.address,
      })
      const {bookId} = await publishBook(publish);
      const {balanceAfter, isPurchaserGifted, isGifteeGifted} = await giftBook(publish, bookId, giftee.account.address, purchaser, publicClient); 

      expect(balanceAfter - balanceBefore).to.equal(parseEther("1"))   ;
      expect(isPurchaserGifted).to.equal(false);
      expect(isGifteeGifted).to.equal(true);  
    })

    it("Should check the total earnings that a book receives", async function() {

    })

    // it("Checks to see that the book owner can withdraw funds from the contract", async function() {
    //   const { publish, owner, otherAccount, publicClient } = await loadFixture(deployPublish);
    //   const author_addr = getAddress(otherAccount.account.address);


    //   await publish.write.publishBook(["Twilight", "Stephenie Meyers", "22r023r2", author_addr, parseEther("1")]);
    //   const BookRegistered = await publish.getEvents.BookRegistered();
    //   const bookId = BookRegistered[0].args.bookId;

    //   if (!bookId) throw new Error("bookId is undefined");
    //   await publish.write.purchaseBook([bookId, owner.account.address], {
    //     account: owner.account.address,
    //     value: parseEther("1")
    //   })

    //   const initialBalanceOwner = await publicClient.getBalance({
    //     address: owner.account.address,
    //   });

    //   await publish.write.withdrawFunds([otherAccount.account.address], {
    //     account: owner.account.address,
    //   })

    //   const finalContractBalance = await publicClient.getBalance({
    //     address: publish.address,
    //   });

    //   const finalBalanceOwner = await publicClient.getBalance({
    //     address: otherAccount.account.address,
    //   });


    //   expect(finalContractBalance).to.equal(parseEther("0"));
    //   expect(((finalBalanceOwner - initialBalanceOwner)/initialBalanceOwner)).to.be.equal(parseEther("0"));


    // })

    // it("Checks to see that an unauthorized user cannot withdraw funds from the contract", async function() {
    //   const { publish, owner, otherAccount, publicClient } = await loadFixture(deployPublish);
    //   const author_addr = getAddress(otherAccount.account.address);


    //   await publish.write.publishBook(["Twilight", "Stephenie Meyers", "22r023r2", author_addr, parseEther("1")]);
    //   const BookRegistered = await publish.getEvents.BookRegistered();
    //   const bookId = BookRegistered[0].args.bookId;

    //   if (!bookId) throw new Error("bookId is undefined");
    //   await publish.write.purchaseBook([bookId, owner.account.address], {
    //     account: owner.account.address,
    //     value: parseEther("1")
    //   })

    //   const initialBalanceOwner = await publicClient.getBalance({
    //     address: owner.account.address,
    //   });

    //   await publish.write.withdrawFunds([otherAccount.account.address], {
    //     account: otherAccount.account.address,
    //   })

    //   const finalContractBalance = await publicClient.getBalance({
    //     address: publish.address,
    //   });

    //   const finalBalanceOwner = await publicClient.getBalance({
    //     address: otherAccount.account.address,
    //   });


    //   expect(finalContractBalance).to.equal(parseEther("0"));
    //   expect(((finalBalanceOwner - initialBalanceOwner)/initialBalanceOwner)).to.be.equal(parseEther("0"));


    // })
    
  })
})