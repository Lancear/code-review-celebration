function timeout(ms) {
  return new Promise(res => setTimeout(() => res(), ms));
}

async function paginated(options, paginatedFn) {
  let page = 1;
  let fetchMore = true;

  // while (fetchMore) {
    fetchMore = await paginatedFn(page);
    // await timeout(options.timeout);
    // page++;
  // }
}
