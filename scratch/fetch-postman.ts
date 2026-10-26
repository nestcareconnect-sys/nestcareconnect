async function printEndpoints() {
  const url = 'https://documenter.gw.postman.com/api/collections/9692837/TW6wHnoz?segregateAuth=true&versionTag=latest';
  const res = await fetch(url);
  const json = await res.json();

  console.log('Collection Name:', json.info?.name);

  function walk(items: any[], prefix = '') {
    for (const item of items) {
      if (item.item) {
        walk(item.item, `${prefix} / ${item.name}`);
      } else if (item.request) {
        const method = item.request.method;
        const reqUrl = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw;
        console.log(`[${method}] ${reqUrl} (${prefix} -> ${item.name})`);
      }
    }
  }

  if (json.item) {
    walk(json.item);
  }
}
printEndpoints();
