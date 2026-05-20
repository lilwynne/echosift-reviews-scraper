const endpoint =
  process.env.REVIEWS_API_URL ?? "http://127.0.0.1:3000/api/reviews";
const url =
  process.argv[2] ?? "https://apps.apple.com/us/app/facebook/id284882215";

async function main() {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url })
  });
  const payload = await response.json();

  if (!response.ok) {
    console.error("Request failed:", response.status, payload);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: payload.ok,
        source: payload.source,
        count: payload.count,
        reviews: payload.reviews?.slice(0, 3)
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
