async function inspectCreateShipment() {
  const url = 'https://documenter.gw.postman.com/api/collections/9692837/TW6wHnoz?segregateAuth=true&versionTag=latest';
  const res = await fetch(url);
  const json = await res.json();

  function findItem(items: any[], name: string): any {
    for (const item of items) {
      if (item.name === name) return item;
      if (item.item) {
        const found = findItem(item.item, name);
        if (found) return found;
      }
    }
    return null;
  }

  const shipmentItem = findItem(json.item, 'Create Shipment');
  console.log('Shipment Item Request Body:');
  console.log(shipmentItem?.request?.body?.raw);
}
inspectCreateShipment();
