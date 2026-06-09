const code = "AP050083918BR";
const urls = [
  `https://rastreamento.correios.com.br/app/index.php?objeto=${code}`,
  `https://rastreamento.correios.com.br/app/index.php?objetos=${code}`,
];

for (const url of urls) {
  const res = await fetch(url);
  const html = await res.text();
  console.log(url);
  console.log("  status:", res.status);
  console.log("  final url:", res.url);
  console.log("  code in html:", html.includes(code));
  const inputMatch = html.match(/value=["']([^"']*)/g)?.slice(0, 5);
  console.log("  sample values:", inputMatch);
}
