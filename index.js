const POLL_INTERVAL = 5 * 60 * 1000;
const PAGE_INTERVAL = 10 * 1000;

const DEFAULT_GIF = 'https://i.pinimg.com/originals/b2/78/a5/b278a5a006340b8946457552adec56c5.gif';

const cardsContainer = document.querySelector('#cards');
const loadingIndicator = document.querySelector('#loading-indicator');

// state
let newestUpdateTimestamp = null;

// const pollIntervalId = setInterval(() => onPoll(), POLL_INTERVAL);
async function onPoll() {
  const firstChildBeforePoll = cardsContainer.firstElementChild;

  await paginated({ timeout: PAGE_INTERVAL }, async (page) => {
    const pullRequests = await loadGithubPullRequests(GITHUB_REPOSITORY, page);
    const newPullRequests = pullRequests.filter(pullRequest => new Date(pullRequest.updated_at) > newestUpdateTimestamp);
    const newlyMergedPullRequests = await getMergedPullRequestsWithReviews(newPullRequests);
    updateLoadingState(newlyMergedPullRequests);

    for (const { pullRequest, reviews } of newlyMergedPullRequests) {
      const card = createPullRequestCard(reviews, pullRequest);
      insertComponentBefore(cardsContainer, firstChildBeforePoll, card);
    }

    return newPullRequests.length === GITHUB_PAGE_SIZE;
  });
}

onPageLoad();
async function onPageLoad() {
  await paginated({ timeout: PAGE_INTERVAL }, async (page) => {
    const pullRequests = await loadGithubPullRequests(GITHUB_REPOSITORY, page);
    const mergedPullRequests = await getMergedPullRequestsWithReviews(pullRequests);
    updateLoadingState(mergedPullRequests);

    for (const { pullRequest, reviews } of mergedPullRequests) {
      const card = createPullRequestCard(reviews, pullRequest);
      appendComponent(cardsContainer, card);
    }

    return pullRequests.length === GITHUB_PAGE_SIZE;
  });
}



function updateLoadingState(newlyMergedPullRequests) {
  if (newlyMergedPullRequests.length > 0) {
    if (!loadingIndicator.classList.contains('hidden')) {
      loadingIndicator.classList.add('hidden');
    }

    const newestUpdateOfPageTimestamp = new Date(newlyMergedPullRequests[0].pullRequest.updated_at);
    if (newestUpdateOfPageTimestamp > newestUpdateTimestamp) {
      newestUpdateTimestamp = newestUpdateOfPageTimestamp;
    }
  }
}

function createPullRequestCard(reviews, pullRequest) {
  const lastCelebrationGifReview = findLastCelebrationGifReview(reviews);
  const celebrationGif = extractCelebrationGifUrl(lastCelebrationGifReview);

  const card = Card(
    pullRequest.title,
    new Date(pullRequest.merged_at),
    pullRequest.html_url,
    getParticipatingUsers(pullRequest, lastCelebrationGifReview),
    lastCelebrationGifReview?.user,
    celebrationGif || DEFAULT_GIF
  );
  return card;
}

async function getMergedPullRequestsWithReviews(newPullRequests) {
  const newlyMergedPullRequests = newPullRequests
    .filter(pullRequest => pullRequest.merged_at)
    .sort((a, b) => new Date(b.merged_at) - new Date(a.merged_at));

  const reviewsPerPullRequest = await Promise.all(newlyMergedPullRequests.map(
    pullRequest => loadGithubPullRequestReviews(GITHUB_REPOSITORY, pullRequest.number)
  ));

  return newlyMergedPullRequests.map((pullRequest, idx) => ({ pullRequest, reviews: reviewsPerPullRequest[idx] }));
}

function getParticipatingUsers(pullRequest, lastCelebrationGifReview) {
  const users = pullRequest.assignees;
  
  if (!users.find(assignee => assignee.login === pullRequest.user?.login)) {
    users.push(pullRequest.user);
  }

  if (lastCelebrationGifReview && !users.find(assignee => assignee.login === lastCelebrationGifReview.user?.login)) {
    users.push(lastCelebrationGifReview?.user);
  }

  return users;
}

function findLastCelebrationGifReview(reviews) {
  if (!reviews) return null;

  reviews.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  return reviews.find(review => /!\[.*\]\((.+)\)/.test(review.body));
}

function extractCelebrationGifUrl(review) {
  return review ? /!\[.*\]\((.+)\)/.exec(review.body)[1].trim() : "";
}
