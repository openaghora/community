import { readFileSync } from "fs";
import { terminal as term } from "terminal-kit";
import { execSync, spawn } from "child_process";
import qrcode from "qrcode-terminal";
import { config } from "dotenv";
import { communityFileExists, communityHashExists } from "@/services/community";

function execPromise(command: string, verbose = false) {
  return new Promise<void>((resolve, reject) => {
    const [cmd, ...args] = command.split(" ");
    const child = spawn(cmd, args);

    if (verbose) {
      child.stdout.on("data", (data) => {
        console.log(data.toString());
      });
    }

    if (verbose) {
      child.stderr.on("data", (data) => {
        console.error(data.toString());
      });
    }

    child.on("error", (error) => {
      console.log(error.message);
      reject(error);
    });

    child.on("exit", (code, signal) => {
      if (code !== 0) {
        const err = new Error(
          `Process exited with code: ${code}, signal: ${signal}`
        );
        console.log(`error: ${err.message}`);
        reject(err);
        return;
      }
      console.log("done", code, signal);
      resolve();
    });
  });
}

async function prepareApp() {
  config();

  term.nextLine(1);
  let cursor = term.saveCursor();
  cursor("App: compiling...");
  const spinner = await term.spinner("dotSpinner");

  // clean up the web folder
  execSync(`rm -rf ${process.cwd()}/.community/web/*`);

  // download version file
  const buildVersionFileName = process.env.BUILD_VERSION_FILE_NAME;
  const buildOutputUrl = process.env.BUILD_OUTPUT_URL;
  execSync(
    `curl -H 'Cache-Control: no-cache' -o ${process.cwd()}/.community/${buildVersionFileName}-web -L ${buildOutputUrl}/web/${buildVersionFileName}?cache_buster=$(date +%s) > /dev/null 2>&1`
  );

  const buildVersion = readFileSync(
    `${process.cwd()}/.community/${buildVersionFileName}-web`,
    "utf8"
  ).replace(/\r?\n|\r/g, "");

  // download the app
  execSync(
    `curl -o ${process.cwd()}/.community/app.tar.gz -L ${buildOutputUrl}/web/cw_web_${buildVersion}.tar.gz > /dev/null 2>&1`
  );

  // extract the app
  execSync(
    `tar -xvf ${process.cwd()}/.community/app.tar.gz -C .community/web > /dev/null 2>&1`
  );

  // remove the tar
  execSync(`rm -rf ${process.cwd()}/.community/app.tar.gz > /dev/null 2>&1`);

  spinner.animate(false);
  cursor.eraseLine();
  cursor.column(1);
  cursor("App: compiled ✅\n");
}

// Purpose: Start the application.
async function main() {
  term.clear();

  const logo = readFileSync("./assets/cw.ans", "utf8");

  term(logo);

  term.nextLine(2);

  term.bold("Citizen Wallet - Community Server\n");

  // TODO: when we need more automation, adding these steps would be helpful

  // TODO: check if .env files exist
  // TODO: if !exists >> prep .env files for nginx and community
  // TODO: check if certs exist
  // TODO: if !exists >> ask for host name
  // TODO: if !exists >> generate SSL certs
  // TODO: if !exists >> stop containers

  // stop all containers
  // await execPromise("docker compose down");

  // start nginx
  term.nextLine(2);
  let cursor = term.saveCursor();
  cursor("Server: starting...");
  let spinner = await term.spinner("dotSpinner");
  await execPromise("docker compose up server --build -d");
  spinner.animate(false);
  cursor.eraseLine();
  cursor.column(1);
  cursor("Server: started ✅\n");

  const communityExists = communityFileExists();
  const hashExists = communityHashExists();
  if (communityExists && hashExists) {
    // start indexer
    term.nextLine(1);
    cursor = term.saveCursor();
    cursor("Indexer: starting...");
    spinner = await term.spinner("dotSpinner");
    await execPromise("docker compose up indexer --build -d");
    spinner.animate(false);
    cursor.eraseLine();
    cursor.column(1);
    cursor("Indexer: started ✅\n");

    // app
    await prepareApp();
  }

  // compile community
  term.nextLine(1);
  cursor = term.saveCursor();
  cursor("Community: compiling...");
  spinner = await term.spinner("dotSpinner");
  await execPromise("npm run build");
  spinner.animate(false);
  cursor.eraseLine();
  cursor.column(1);
  cursor("Community: compiled ✅\n");

  // start community
  term.nextLine(1);
  cursor = term.saveCursor();
  cursor("Community: starting...");
  spinner = await term.spinner("dotSpinner");
  spawn("npx next start -H 0.0.0.0", {
    detached: true,
    shell: true,
    stdio: "ignore",
  });
  spinner.animate(false);
  cursor.eraseLine();
  cursor.column(1);
  cursor("Community: started ✅\n");

  // parse .env
  config();

  // display url
  term.nextLine(2);
  term.bold("Community URL\n");
  term.nextLine(2);
  qrcode.generate(
    `https://${process.env.NGINX_HOST}${process.env.NEXT_PUBLIC_BASE_PATH}`
  );
  term.nextLine(1);
  term.underline(
    `https://${process.env.NGINX_HOST}${process.env.NEXT_PUBLIC_BASE_PATH}`
  );
  term.nextLine(2);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
