import hre from "hardhat";
import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { getAddress, parseEther, zeroAddress } from "viem";
import { author_name, bookTitle, deleteBook, deleteBookFor, getBookEarning, getBookEarningAuth, giftBook, hash, isAuthorized, publishBook, publishBookFor, purchaseBook, updateInfo, updateInfoFor, withdrawFunds, withdrawFundsFor } from "./utils/helpers";


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
      const price = parseEther("0.01");

      const {bookAuthor, title, authorName, ipfsHash} = await publishBook(publish, price);

      expect(bookAuthor).to.equal(author_addr);
      
      expect(title).to.equal(bookTitle);
      expect(authorName).to.equal(author_name);
      expect(ipfsHash).to.equal(hash);
    });

    it("Authorizer should publish book on behalf of the author", async function() {
      const { publish, author } = await loadFixture(deployPublish);

      const price = parseEther("0.01");
      const {bookAuthor_addr, title, authorName, publisher_addr, ipfsHash} = await publishBookFor(publish, author.account.address, price);

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

      const price = parseEther("0.01");
      const {bookId} = await publishBook(publish, price);
      const {isPurchased, balanceAfter} = await purchaseBook(publish, bookId, purchaser, publicClient, price);

      expect(isPurchased).to.equal(true);  
      expect(balanceAfter - balanceBefore).to.equal(price)   
    })

    it("Should allow users to gift books to another user", async function () {
      const { publish, purchaser, publicClient, giftee } = await loadFixture(deployPublish);

      const balanceBefore = await publicClient.getBalance({
        address: publish.address,
      })

      const price = parseEther("0.01");
      const {bookId} = await publishBook(publish, price);
      const {balanceAfter, isPurchaserGifted, isGifteeGifted} = await giftBook(publish, bookId, giftee.account.address, purchaser, publicClient, price); 

      expect(balanceAfter - balanceBefore).to.equal(price)   ;
      expect(isPurchaserGifted).to.equal(false);
      expect(isGifteeGifted).to.equal(true);  
    })

    it("Should check the total earnings that a book receives", async function() {
      const { publish, purchaser, giftee, publicClient } = await loadFixture(deployPublish);

      const balanceBefore = await publicClient.getBalance({
        address: publish.address,
      })

      const price = parseEther("0.01");

      const {bookId} = await publishBook(publish, price);
      const {balanceAfter} = await purchaseBook(publish, bookId, purchaser, publicClient, price);

      expect(balanceAfter - balanceBefore).to.equal(price);

      const {balanceAfter: balanceAfterSecondPurchase} = await purchaseBook(publish, bookId, giftee, publicClient, price);
      const {earned} = await getBookEarning(publish, bookId);

      expect(balanceAfterSecondPurchase - balanceAfter).to.equal(price);
      expect(balanceAfterSecondPurchase - balanceBefore).to.equal((price + price));
      expect(balanceAfterSecondPurchase).to.equal(earned);
    })

    // Cannot purchase book more than once

    it("Checks to see that only authors can withdraw funds from the contract", async function () {
      //const { publish, authorizer, author, purchaser, publicClient } = await loadFixture(deployPublish);
      const { publish, author, purchaser, giftee, publicClient } = await loadFixture(deployPublish);

      const price = parseEther("0.01");

      const initial_bal = await publicClient.getBalance({address: author.account.address})
      const authorBalance = await publish.read.balances([author.account.address]);

      const {bookId} = await publishBookFor(publish, author.account.address, price);

      // Two people have purchased the book 
      await purchaseBook(publish, bookId, purchaser, publicClient, price);
      await purchaseBook(publish, bookId, giftee, publicClient, price);

      const authorBalanceAfter = await publish.read.balances([author.account.address]);
   
      expect(authorBalanceAfter - authorBalance).to.equal(authorBalanceAfter); 

      await withdrawFunds(publish, author);

      const balanceAfterWithdraw = await publish.read.balances([author.account.address]);
      
      expect(balanceAfterWithdraw).to.equal(parseEther("0"));

      const final_bal = await publicClient.getBalance({address: author.account.address, })

      const expectedGain = price * 2n; // 0.01 * 2 = 0.02 ETH
      const actualGain = final_bal - initial_bal;

      expect(Number(actualGain)).to.be.closeTo(Number(expectedGain), Number(parseEther("0.0001")));

    })

    it("Checks to see that only authorized users can withdraw funds from the contract to author", async function () {
      //const { publish, authorizer, author, purchaser, publicClient } = await loadFixture(deployPublish);
      const { publish, author, purchaser, giftee, publicClient } = await loadFixture(deployPublish);

      const price = parseEther("0.01");

      const initial_bal = await publicClient.getBalance({address: author.account.address})
      const authorBalance = await publish.read.balances([author.account.address]);

      const {bookId} = await publishBookFor(publish, author.account.address, price);

      // Two people have purchased the book 
      await purchaseBook(publish, bookId, purchaser, publicClient, price);
      await purchaseBook(publish, bookId, giftee, publicClient, price);

      const authorBalanceAfter = await publish.read.balances([author.account.address]);
   
      expect(authorBalanceAfter - authorBalance).to.equal(authorBalanceAfter); 

      await withdrawFundsFor(publish, author.account.address);

      const balanceAfterWithdraw = await publish.read.balances([author.account.address]);
      
      expect(balanceAfterWithdraw).to.equal(parseEther("0"));

      const final_bal = await publicClient.getBalance({address: author.account.address, })

      const expectedGain = price * 2n; // 0.01 * 2 = 0.02 ETH
      const actualGain = final_bal - initial_bal;

      expect(Number(actualGain)).to.be.closeTo(Number(expectedGain), Number(parseEther("0.0001")));
    })

    it("Should allow authors to update book info", async function () {
      const { publish, author } = await loadFixture(deployPublish);

      const price = parseEther("0.01");
      const {bookId, title, ipfsHash} = await publishBookFor(publish, author.account.address, price);
      const {title: newTitle, ipfsHash: newHash} = await updateInfo(publish, bookId, price, author);

      expect(title).to.not.equal(newTitle);
      expect(ipfsHash).to.not.equal(newHash);
    })

    it("Should allow authorized users to update book info for authors", async function () {
      const { publish, author } = await loadFixture(deployPublish);

      const price = parseEther("0.01");
      const {bookId, title, ipfsHash} = await publishBookFor(publish, author.account.address, price);
      const {title: newTitle, ipfsHash: newHash} = await updateInfoFor(publish, bookId, price, author.account.address);

      expect(title).to.not.equal(newTitle);
      expect(ipfsHash).to.not.equal(newHash);
    })

    it("Should allow authors to delete book", async function () {
      const { publish, author } = await loadFixture(deployPublish);

      const price = parseEther("0.01");
      const {bookId} = await publishBookFor(publish, author.account.address, price);

      const {title, authorName, publisher_addr, ipfsHash} = await deleteBook(publish, bookId, author);

      expect(title).to.be.empty;
      expect(authorName).to.be.empty;
      expect(publisher_addr).to.equal(zeroAddress);
      expect(ipfsHash).to.be.empty;
    })

    it("Should allow authorized user to delete book for author", async function () {
      const { publish, author } = await loadFixture(deployPublish);

      const price = parseEther("0.01");
      const {bookId} = await publishBookFor(publish, author.account.address, price);

      const {title, authorName, publisher_addr, ipfsHash} = await deleteBookFor(publish, bookId, author);

      expect(title).to.be.empty;
      expect(authorName).to.be.empty;
      expect(publisher_addr).to.equal(zeroAddress);
      expect(ipfsHash).to.be.empty;
    })  
  })
})