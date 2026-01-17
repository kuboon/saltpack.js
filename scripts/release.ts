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

// Run git commands
async function run(cmd: string[]) {
  console.log(`> ${cmd.join(" ")}`);
  const command = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await command.output();
  if (code !== 0) {
    console.error(`Command failed with code ${code}`);
    Deno.exit(code);
  }
}

const tagName = `v${newVersion}`;

await run(["git", "add", "deno.json"]);
await run(["git", "commit", "-m", `chore: bump version to ${newVersion}`]);
await run(["git", "tag", tagName]);
await run(["git", "push", "origin", "main"]); // push commit first
await run(["git", "push", "origin", tagName]); // trigger workflow

console.log(
  `\nSuccessfully pushed tag ${tagName} to trigger release workflow.`,
);
