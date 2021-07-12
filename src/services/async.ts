/* ES& version of the async functions used from async library */

/**
 *
 *
 * @export
 * @param {*} funcs Array uf functions
 * @param {*} limit Limit of async operations at the same time
 * @return {*}
 */
export async function eachLimit (funcs, limit) {
  const results = [];

  await Promise.all(funcs.slice(0, limit).map(async (func, i) => {
    results[i] = await func();
    while ((i = limit++) < funcs.length) {
      results[i] = await funcs[i]();
    }
  }));
  return results;
}
