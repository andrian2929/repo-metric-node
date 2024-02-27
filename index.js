const { execSync } = require('child_process');
const fs = require('fs');
const { EOL } = require('os');
const { program } = require('commander');

const TEMP_DIR = 'tmp';
const OUTPUT_FILE = 'output.json';

program
  .requiredOption('-f, --file <file>', 'File containing list of repositories')
  .option('-s, --since <date>', 'Only show stats after this date')
  .option('-u, --until <date>', 'Only show stats before this date')
  .usage('A simple tool to get the metric summary of a list of repositories')
  .addHelpText('after')
  .parse();

const options = program.opts();

const fileName = options.file;
const sinceDate = options.since || null;
const untilDate = options.until || null;

if (!fs.existsSync(fileName)) {
  console.error(`File ${fileName} does not exist`);
  process.exit(1);
}

if (fs.statSync(fileName).size === 0) {
  console.error(`File ${fileName} is empty`);
  process.exit(1);
}

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

if (fs.existsSync(OUTPUT_FILE)) fs.unlinkSync(OUTPUT_FILE);

function getRepoName(repoLink) {
  console.log(checkProtocol(repoLink));
  if (checkProtocol(repoLink) === 'ssh') {
    const sshPattern = /git@[^:]+:([^/]+)\/([^/]+)\.git/;
    const match = repoLink.match(sshPattern);
    if (match) return `${match[1]}-${match[2]}`;
  }

  if (checkProtocol(repoLink) === 'http') {
    const httpPattern =
      /^(?:https?:\/\/(?:[^@]+@)?|git@)[^\/:]+[\/:](.+?)\/(.+?)(?:\.git)?$/;
    const match = repoLink.match(httpPattern);
    if (match) return `${match[1]}-${match[2]}`;
  }

  process.exit(1);
}

function checkProtocol(repoLink) {
  const sshPattern =
    /^git@[a-zA-Z0-9\-]+(\.[a-zA-Z0-9\-]+)*:[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+\.git$/;
  const httpPattern =
    /^(?:https?:\/\/(?:[^@]+@)?|git@)[^\/:]+[\/:](.+?)\/(.+?)(?:\.git)?$/;

  if (sshPattern.test(repoLink)) return 'ssh';

  if (httpPattern.test(repoLink)) return 'http';

  return 'invalid';
}

function extractEmail(author) {
  const email = author.match(
    /<([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>/
  );
  return email ? email[1] : '';
}

function extractName(author) {
  return author.split('\t')[1].match(/(.*) <.*>/)[1];
}

function getSummaryCommand(email, since, until) {
  let summaryCommand;

  switch (true) {
    case !!since && !!until:
      summaryCommand = `git log --all --author="${email}" --since="${since}" --until="${until}" --pretty=tformat: --numstat`;
      break;
    case !!since:
      summaryCommand = `git log --all --author="${email}" --since="${since}" --pretty=tformat: --numstat`;
      break;
    case !!until:
      summaryCommand = `git log --all --author="${email}" --until="${until}" --pretty=tformat: --numstat`;
      break;
    default:
      summaryCommand = `git log --all --author="${email}" --pretty=tformat: --numstat`;
      break;
  }

  return summaryCommand;
}

const jsonContent = {
  repoStats: [],
  userStats: [],
};

const fileContent = fs.readFileSync(fileName, 'utf-8').split(EOL);

for (const repoLink of fileContent) {
  if (repoLink.trim() === '') continue;

  const repoDir = getRepoName(repoLink);

  const repoSummary = {
    repository: repoLink,
    contributors: [],
  };

  if (fs.existsSync(`${TEMP_DIR}/${repoDir}`)) {
    console.log(
      `Repository already exists: ${repoDir}. Pulling the latest changes.`
    );
    execSync(`cd ${TEMP_DIR}/${repoDir} && git pull`);
    console.log('Successfully pulled the latest changes.');
  } else {
    console.log(`Cloning repository: ${repoLink}`);
    execSync(`git clone ${repoLink} ${TEMP_DIR}/${repoDir}`);
    console.log('Successfully cloned the repository.');
  }

  console.log(`Getting metric summary for ${repoLink} ...`);

  execSync(`cd ${TEMP_DIR}/${repoDir} && git shortlog -sne --all`, {
    encoding: 'utf8',
  })
    .split('\n')
    .slice(0, -1)
    .filter((author) => {
      const email = extractEmail(author);
      if (email) return true;
    })
    .map((author) => extractEmail(author))
    .filter((email, index, self) => self.indexOf(email) === index)
    .forEach((email) => {
      console.log(`Getting metric summary for <${email}> ...`);

      const summaryCommand = getSummaryCommand(email, sinceDate, untilDate);

      const summary = execSync(
        `cd ${TEMP_DIR}/${repoDir} && ${summaryCommand} | awk '{insertions+=$1; deletions+=$2} END {print insertions, deletions}'`,
        { encoding: 'utf8' }
      )
        .trim()
        .split(' ');

      const insertions = parseInt(summary[0] || 0);
      const deletions = parseInt(summary[1] || 0);

      repoSummary.contributors.push({
        email,
        insertions,
        deletions,
      });
    });

  jsonContent.repoStats.push(repoSummary);

  console.log(`Successfully retrieved metric summary for ${repoLink}`);
}

getUserStats(jsonContent);

function getUserStats(jsonContent) {
  console.log('Getting user stats ...');
  console.log(jsonContent.repoStats.length);
  for (const repo of jsonContent.repoStats) {
    for (const contributor of repo.contributors) {
      const user = jsonContent.userStats.find(
        (user) => user.email === contributor.email
      );
      if (user) {
        user.insertions += contributor.insertions;
        user.deletions += contributor.deletions;
      } else {
        jsonContent.userStats.push({
          email: contributor.email,
          insertions: contributor.insertions,
          deletions: contributor.deletions,
        });
      }
    }
  }
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(jsonContent, null, 2));

console.log(`Output written to ${OUTPUT_FILE}`);
