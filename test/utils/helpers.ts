import { parseEther } from "viem";

export const bookTitle = "Twilight"
export const author_name: string = "Stephenie Meyers";
export const hash: string = "22r023r2";

export async function publishBook(publishContract: any) {
    // Calls function publishBook
    await publishContract.write.publishBook([bookTitle, author_name, hash, parseEther("1")]);
  
    // get the BookRegistered event in the latest block
    const BookRegistered = await publishContract.getEvents.BookRegistered();

    const bookId = BookRegistered[0].args.bookId;
    const bookAuthor = BookRegistered[0].args.author_addr;

    if (!bookId) throw new Error("bookId is undefined");

    const [title, authorName, , ipfsHash] = await getBookInfo(publishContract, bookId);

    return {bookId, bookAuthor, title, authorName, ipfsHash}
}


export async function getBookInfo(publishContract: any, bookId: string) {
  const [title, authorName, publisher_addr, ipfsHash, ] = await publishContract.read.getBook([bookId]);

  return [title, authorName, publisher_addr, ipfsHash]
}


export async function publishBookFor(publishContract: any, author_addr: string) {
  // Calls function publishBookFor
  await publishContract.write.publishBookFor([bookTitle, author_name, hash, parseEther("1"), author_addr]);

  // get the BookRegistered event in the latest block
  const BookRegistered = await publishContract.getEvents.BookRegistered();

  const bookId = BookRegistered[0].args.bookId;
  const bookAuthor_addr = BookRegistered[0].args.author_addr;

  if (!bookId) throw new Error("bookId is undefined");

  const [title, authorName, publisher_addr, ipfsHash] = await getBookInfo(publishContract, bookId);

  return {bookId, bookAuthor_addr, title, authorName, publisher_addr, ipfsHash}
}

export async function purchaseBook(publishContract: any, bookId: string, purchaser: any, publicClient: any) {

  await publishContract.write.purchaseBook([bookId], {
    account: purchaser.account.address,
    value: parseEther("1")
  })

  const balanceAfter = await publicClient.getBalance({
    address: publishContract.address,
  })

  const isPurchased = await publishContract.read.checkPurchaser([bookId, purchaser.account.address]);

  return {isPurchased, balanceAfter}
}


export async function giftBook(publishContract: any, bookId: string, giftee: string, purchaser: any, publicClient: any) {

  await publishContract.write.giftBook([bookId, giftee], {
    account: purchaser.account.address,
    value: parseEther("1")
  })

  const balanceAfter = await publicClient.getBalance({
    address: publishContract.address,
  })

  const isPurchaserGifted = await publishContract.read.checkPurchaser([bookId, purchaser.account.address]);
  const isGifteeGifted = await publishContract.read.checkPurchaser([bookId, giftee]);

  return {isPurchaserGifted, isGifteeGifted, balanceAfter}
}