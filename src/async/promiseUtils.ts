/**
 * ASYNC DRILLS — the three most common "implement this utility" Node questions.
 */

/**
 * DRILL 1 — withTimeout
 * Resolve/reject with the promise's result, but reject with
 * Error('Timeout after {ms}ms') if it takes longer than ms.
 * Bonus points: don't leave a dangling timer (clearTimeout).
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: NodeJS.Timeout;
  const timeout = (timeout:number) => new Promise<T>((_res,rej)=>{
      timer = setTimeout(()=>rej(new Error(`Timeout after ${timeout}ms`)),timeout)
  });
  return Promise.race([promise,timeout(ms)]).finally(()=>clearTimeout(timer))
};

/**
 * DRILL 2 — retry
 * Call fn; if it rejects, try again up to `attempts` total calls,
 * waiting delayMs between attempts. Reject with the last error.
 */
export const retry = <T>(
  fn: () => Promise<T>,
  attempts: number,
  delayMs = 0,
): Promise<T> => {

  return new Promise((res,rej)=>{

    fn().then(r=>res(r))
      .catch((err)=>{
        if(--attempts<=0){
          rej(err)
          return;
        }
        setTimeout(()=>res(retry(fn, attempts,delayMs)),delayMs)
      })
  });
};

/**
 * DRILL 3 — mapLimit (the classic!)
 * Like Promise.all(items.map(fn)) but with at most `limit`
 * promises in flight at once. Results keep input order.
 */
export const mapLimit = async <T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
const results: R[] = new Array(items.length);
  let cursor = 0;                        // กองงานกลาง — ทุก worker แชร์ตัวเดียวกัน

  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;                // จองงานของตัวเอง
      results[i] = await fn(items[i]!, i); // ทำ → วางผลตามช่อง index
    }
  };

  // ปล่อยพนักงาน limit คน แล้วรอทุกคนเลิกงาน
  await Promise.all([...Array(limit)].map(() => worker()) );
  return results;
};
