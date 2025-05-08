export const bookTitle = "Twilight"
export const author_name: string = "Stephenie Meyers";
export const hash: string = "22r023r2";

export const newBookTitle = "New Moon";
export const newBookHash: string = "22rt023r2";
export const zeroAddress = "0x0000000000000000000000000000000000000000";

export async function isAuthorized (publishContract: any, authorized: string) {
  const isAuthorized = await publishContract.read.authorizedAccounts([authorized]);
  return isAuthorized; 
}

export async function publishBook(publishContract: any, price: any) {
    // Calls function publishBook
    await publishContract.write.publishBook([bookTitle, author_name, hash, price]);
  
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


export async function publishBookFor(publishContract: any, author_addr: string, price: any) {
  // Calls function publishBookFor
  await publishContract.write.publishBookFor([bookTitle, author_name, hash, price, author_addr]);

  // get the BookRegistered event in the latest block
  const BookRegistered = await publishContract.getEvents.BookRegistered();

  const bookId = BookRegistered[0].args.bookId;
  const bookAuthor_addr = BookRegistered[0].args.author_addr;

  if (!bookId) throw new Error("bookId is undefined");

  const [title, authorName, publisher_addr, ipfsHash] = await getBookInfo(publishContract, bookId);

  return {bookId, bookAuthor_addr, title, authorName, publisher_addr, ipfsHash}
}

export async function updateInfo(publishContract: any, bookId: string, price: any, author: any) {
  await publishContract.write.updateBookInfo([bookId, newBookTitle, newBookHash, price], {
    account: author.account
  });

  const [title, , , ipfsHash] = await getBookInfo(publishContract, bookId);

  return {title, ipfsHash}
}

export async function updateInfoFor(publishContract: any, bookId: string, price: any, author_addr: string) {
  await publishContract.write.updateBookInfoFor([bookId, newBookTitle, newBookHash, price, author_addr]);

  const [title, , , ipfsHash] = await getBookInfo(publishContract, bookId);

  return {title, ipfsHash}
}

export async function purchaseBook(publishContract: any, bookId: string, purchaser: any, publicClient: any, price: any) {

  await publishContract.write.purchaseBook([bookId], {
    account: purchaser.account.address,
    value: price
  })

  const balanceAfter = await publicClient.getBalance({
    address: publishContract.address,
  })

  const isPurchased = await publishContract.read.checkPurchaser([bookId, purchaser.account.address]);

  return {isPurchased, balanceAfter}
}


export async function giftBook(publishContract: any, bookId: string, giftee: string, purchaser: any, publicClient: any, price: any) {

  await publishContract.write.giftBook([bookId, giftee], {
    account: purchaser.account.address,
    value: price
  })

  const balanceAfter = await publicClient.getBalance({
    address: publishContract.address,
  })

  const isPurchaserGifted = await publishContract.read.checkPurchaser([bookId, purchaser.account.address]); // Checks that the purchaser doesn't actually have the book
  const isGifteeGifted = await publishContract.read.checkPurchaser([bookId, giftee]); // Checks that the giftee is actually receiving the book 

  return {isPurchaserGifted, isGifteeGifted, balanceAfter}
}


export async function getBookEarning(publishContract: any, bookId: string) {
  const earned = await publishContract.read.getBookEarnings([bookId]);
  return { earned }
}

export async function getBookEarningAuth(publishContract: any, bookId: string, authorized: any){
  const earned = await publishContract.read.getBookEarnings([bookId], {
    account: authorized.account,
  });
  return { earned }

}

export async function withdrawFunds(publishContract: any, author: any) {
  await publishContract.write.withdrawFunds([], {
    account: author.account.address
  })
}


export async function withdrawFundsFor(publishContract: any, author_addr: string) {
  await publishContract.write.withdrawFundsFor([author_addr])
}

export async function deleteBook(publishContract: any, bookId:string, author: any) {
  await publishContract.write.deleteBook([bookId], {
    account: author.account
  });
  const [title, authorName, publisher_addr, ipfsHash] = await getBookInfo(publishContract, bookId);

  return {title, authorName, publisher_addr, ipfsHash};
}

export async function deleteBookFor(publishContract: any, bookId:string, author: any) {
  await publishContract.write.deleteBookFor([bookId, author.account.address]);
  const [title, authorName, publisher_addr, ipfsHash] = await getBookInfo(publishContract, bookId);

  return {title, authorName, publisher_addr, ipfsHash};
}