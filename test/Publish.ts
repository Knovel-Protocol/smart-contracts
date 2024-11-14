import hre from "hardhat";
import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { getAddress, parseEther } from "viem";


describe("Publish", function() {
  async function deployPublish() {

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.viem.getWalletClients();

    const publish = await hre.viem.deployContract("PublishRegistry");
    const publicClient = await hre.viem.getPublicClient();

    // Fund the owner with 10 Ether for testing purposes
    // await hre.network.provider.send("hardhat_setBalance", [
    //   owner.account.address,
    //   "0x8AC7230489E80000" 
    // ])
     
    return {
      publish,
      owner,
      otherAccount,
      publicClient,
    };
  }

  describe("Deployment", function () {
    it("User should publish a book", async function() {
      const { publish, owner } = await loadFixture(deployPublish);

      // Calls function publishBook
      await publish.write.publishBook(["Twilight", "Stephenie Meyers", "22r023r2", parseEther("1")]);

      // get the BookRegistered event in the latest block
      const BookRegistered = await publish.getEvents.BookRegistered();

      expect(BookRegistered).to.have.lengthOf(1);
      expect(BookRegistered[0].args.author_addr).to.equal(getAddress(owner.account.address));

      const bookId = BookRegistered[0].args.bookId;
      if (!bookId) throw new Error("bookId is undefined");

      const [title, author, ipfsHash, ] = await publish.read.getBook([bookId]);

      expect(title).to.equal("Twilight");
      expect(author).to.equal("Stephenie Meyers");
      expect(ipfsHash).to.equal("22r023r2");
    });

    it("Checks that the user purchased the book", async function () {
      const { publish, owner, otherAccount, publicClient } = await loadFixture(deployPublish);
      await publish.write.publishBook(["Twilight", "Stephenie Meyers", "22r023r2", parseEther("1")]);
      const BookRegistered = await publish.getEvents.BookRegistered();
      const bookId = BookRegistered[0].args.bookId;

      if (!bookId) throw new Error("bookId is undefined");


      await publish.write.purchaseBook([bookId], {
        account: otherAccount.account.address,
        value: parseEther("1")
      })

      const balance = await publicClient.getBalance({
        address: publish.address,
      })

      const isPurchaser = await publish.read.checkPurchaser([bookId, otherAccount.account.address]);
      expect(isPurchaser).to.equal(true);  
      expect(balance).to.equal(parseEther("1"))   
    }); 

    it("Checks to see that the book owner can withdraw funds from the contract", async function() {
      const { publish, owner, otherAccount, publicClient } = await loadFixture(deployPublish);

      await publish.write.publishBook(["Twilight", "Stephenie Meyers", "22r023r2", parseEther("1")]);
      const BookRegistered = await publish.getEvents.BookRegistered();
      const bookId = BookRegistered[0].args.bookId;

      if (!bookId) throw new Error("bookId is undefined");
      await publish.write.purchaseBook([bookId], {
        account: otherAccount.account.address,
        value: parseEther("1")
      })

      const initialBalanceOwner = await publicClient.getBalance({
        address: owner.account.address,
      });

      await publish.write.withdrawFunds({
        account: owner.account.address,
      })

      const finalContractBalance = await publicClient.getBalance({
        address: publish.address,
      });

      const finalBalanceOwner = await publicClient.getBalance({
        address: owner.account.address,
      });


      expect(finalContractBalance).to.equal(parseEther("0"));
      expect(((finalBalanceOwner - initialBalanceOwner)/initialBalanceOwner)).to.be.equal(parseEther("0"));


    })
    
  })
})