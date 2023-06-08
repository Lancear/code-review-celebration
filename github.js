const GITHUB_TOKEN = 'tok tok';
const GITHUB_REPOSITORY = 'shopstory-ai/pulse';
const GITHUB_PAGE_SIZE = 100;

function loadGithubRepositories() {
  return fetch('/api/repos')
    .then(res => res.json());
}

function loadGithubPullRequests(repo, page) {
  return fetch(`/api/pulls?repo=${repo}&page=${page}`)
    .then(res => res.json());
}

function loadGithubPullRequestReviews(repo, pullRequest) {
  return fetch(`/api/reviews?repo=${repo}&pr=${pullRequest}`)
    .then(res => res.json());
}
