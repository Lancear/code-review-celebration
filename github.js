const GITHUB_TOKEN = 'tok tok';
const GITHUB_REPOSITORY = 'shopstory-ai/pulse';
const GITHUB_PAGE_SIZE = 100;

function loadGithubPullRequests(repo, token, page) {
  return fetch(`/api/pulls?repo=${repo}&page=${page}`)
    .then(res => res.json());
}

function loadGithubPullRequestReviews(repo, token, pullRequest) {
  return fetch(`/api/reviews?repo=${repo}&pr=${pullRequest}&page=${page}`)
    .then(res => res.json());
}
