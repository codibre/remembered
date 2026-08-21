const fs = require('fs');
const path = require('path');

const commitTemplatePath = path.resolve(__dirname, 'commit.hbs');
let commitTemplate = fs.existsSync(commitTemplatePath)
  ? fs.readFileSync(commitTemplatePath).toString()
  : '#### {{subject}}\n\n{{#if body}}{{{body}}}{{/if}}';

// Determine repository URL (prefer package.json repository, fall back to git remote)
function normalizeRepoUrl(raw) {
  if (!raw) return null;
  let url = raw.replace(/^git\+/, '').replace(/\.git$/, '');
  const sshMatch = url.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    url = `https://${sshMatch[1]}/${sshMatch[2]}`;
  }
  url = url.replace(/^ssh:\/\//, 'https://');
  return url;
}

function detectRepoUrl() {
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath).toString());
      const repo = pkg.repository && (pkg.repository.url || pkg.repository);
      const normalized = normalizeRepoUrl(repo);
      if (normalized) return normalized;
    }
  } catch (e) {}

  try {
    const { execSync } = require('child_process');
    const raw = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const normalized = normalizeRepoUrl(raw);
    if (normalized) return normalized;
  } catch (e) {}

  return null;
}

const typeMap = {
  feat: 'Features:',
  fix: 'Fixes:',
}

function getPackageName() {
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return pkg.name;
    }
  } catch (e) {}
  return null;
}

const packageName = getPackageName();
const repoUrl = detectRepoUrl();
if (repoUrl && commitTemplate.indexOf('/commit/{{hash}}') !== -1) {
  commitTemplate = commitTemplate.replace(/https?:\/\/[^\s\/]+\/[\w.-]+\/[\w.-]+\/commit\/\{\{hash\}\}/g, `${repoUrl}/commit/{{hash}}`);
}
if (commitTemplate.indexOf('__REPO_URL__') !== -1) {
  commitTemplate = commitTemplate.replace(/__REPO_URL__/g, repoUrl);
}

/** @type {import('release-it').ReleaseConfig} **/
module.exports = {
  git: {
    tagName: '${npm.name}@${version}',
    commitMessage: 'chore(${npm.name}): release v${version} [skip ci]',
    requireCleanWorkingDir: false,
    commitsPath: '.',
    push: true,
    pushRepo: 'origin',
    requireCommits: false
  },
  npm: { publish: false, skipChecks: true },
  github: { release: false },
  hooks: {
    'after:bump': 'pnpm publish --no-git-checks'
  },
  plugins: {
    '@release-it/conventional-changelog': {
      preset: {
        name: 'conventionalcommits',
        types: [
          { type: 'feat', section: 'Features:' },
          { type: 'fix', section: 'Fixes:' },
        ],
      },
      infile: 'CHANGELOG.md',
      ignoreRecommendedBump: false,
      strictSemVer: true,
      commitsPath: '.',
      gitRawCommitsOpts: {
        path: '.',
        format: '%s%n%n%b%n%H',
      },
      writerOpts: {
        commitPartial: commitTemplate,
        headerPartial: '## [{{version}}]({{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{packageName}}@{{version}}) ({{date}})',
        finalizeContext: function (context) {
          context.packageName = packageName;
          return context;
        },
        transform: function (commit) {
          const out = Object.assign({}, commit);

          if (out.type === 'chore' && out.scope && /release v\d+\.\d+\.\d+/.test(out.subject)) {
            return null;
          }

          const typeTitle = typeMap[out.type];
          if (typeTitle) out.type = typeTitle;

          if (out.hash && typeof out.hash === 'string') out.hash = out.hash.substring(0, 7);
          if ((!out.hash || out.hash.length === 0) && out.body && typeof out.body === 'string') {
            const m = out.body.match(/([0-9a-f]{7,40})$/m);
            if (m) {
              out.hash = m[1].substring(0, 7);
              out.body = out.body.replace(/(?:\r?\n)?[0-9a-f]{7,40}\s*$/m, '').trim();
            }
          }

          if (out.body && typeof out.body === 'string') {
            out.body = out.body.replace(/\r\n/g, '\n').split('\n').map(l => l.trim() ? ('> ' + l) : '').join('\n').trim();
          }
          return out;
        },
        groupBy: 'type',
        commitGroupsSort: 'title',
        commitsSort: ['scope', 'subject'],
      },
      skipOnEmpty: true,
    },
  },
};
