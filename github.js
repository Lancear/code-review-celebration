const GITHUB_TOKEN = 'tok tok';
const GITHUB_REPOSITORY = 'shopstory-ai/pulse';
const GITHUB_PAGE_SIZE = 100;

function loadGithubPullRequests(repo, token, page) {
  return fetch(`/api/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=${GITHUB_PAGE_SIZE}&page=${page}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).then(res => res.json());
}

function loadGithubPullRequestReviews(repo, token, pullRequest) {
  return fetch(`https://api.github.com/repos/${repo}/pulls/${pullRequest}/reviews?sort=created&direction=desc&per_page=${GITHUB_PAGE_SIZE}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).then(res => res.json());
}
