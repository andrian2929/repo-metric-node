## Introduction

Simple command-line tool that allows you to get a metric summary of a list of repositories. The tool retrieves information about contributors, their commit statistics (insertions and deletions), and generates a JSON file with the summary.

## Requirement

- Node 20 or higher

## Usage

1. Install all dependecies:
   ```
   npm install
   ```
2. Run this command to start the tool
   ```bash
   node index.js -f path/to/text/file
   ```
3. This script will generate a json file as output. For example:
   ```json
   [
     {
       "repository": "https://github.com/material-components/material-web",
       "contributors": [
         {
           "name": "Elliott Marquez",
           "email": "emarquez@google.com",
           "insertion": 112934,
           "deletion": 73547
         },
         {
           "name": "Elizabeth Mitchell",
           "email": "lizmitchell@google.com",
           "insertion": 224671,
           "deletion": 217651
         }
       ]
     },
     {
       "repository": "https://github.com/tmux/tmux",
       "contributors": [
         {
           "name": "Nicholas Marriott",
           "email": "nicholas.marriott@gmail.com",
           "insertion": 320492,
           "deletion": 171988
         },
         {
           "name": "Thomas Adam",
           "email": "thomas@xteddy.org",
           "insertion": 1808,
           "deletion": 765
         }
       ]
     }
   ]
   ```

## Help
```bash
Usage:  A simple tool to get the metric summary of a list of repositories

Options:
  -f, --file <file>   File containing list of repositories
  -s, --since <date>  Only show commits after this date
  -u, --until <date>  Only show commits before this date
  -h, --help          display help for command
```

## Authors

- [@andrianramadan](https://www.github.com/andrianramadan)

**Made with ❤️ by Aan**
