const GITHUB_PAGE_SIZE = 24;

function loadGithubOrganizations() {
  return fetch('/api/orgs')
    .then(res => res.json());
}

function loadGithubRepositories(org) {
  const query = org ? `?org=${org}` : '';

  return fetch(`/api/repos${query}`)
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
