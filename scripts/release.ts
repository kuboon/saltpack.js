const denoJsonPath = new URL("../deno.json", import.meta.url);
const denoJsonText = await Deno.readTextFile(denoJsonPath);
const denoJson = JSON.parse(denoJsonText);
const currentVersion = denoJson.version;

let newVersion = Deno.args[0];

if (!newVersion) {
  console.log(`Current version: ${currentVersion}`);
  const input = prompt("Enter new version:");
  if (!input) {
    console.error("Version is required");
    Deno.exit(1);
  }
  newVersion = input;
}

// Clean up version string (remove leading 'v' if present)
if (newVersion.startsWith("v")) {
  newVersion = newVersion.substring(1);
}

// Update deno.json
denoJson.version = newVersion;
await Deno.writeTextFile(
  denoJsonPath,
  JSON.stringify(denoJson, null, 2) + "\n",
);
console.log(`Updated deno.json version to ${newVersion}`);
