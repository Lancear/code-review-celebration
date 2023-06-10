const POLL_INTERVAL = 5 * 60 * 1000;
const PAGE_INTERVAL = 10 * 1000;

const DEFAULT_GIF = 'https://i.pinimg.com/originals/b2/78/a5/b278a5a006340b8946457552adec56c5.gif';

const cardsContainer = document.querySelector('#cards');
let loadingIndicator = document.querySelector('#loading-indicator');
const footer = document.querySelector('#footer');
const closeFooterButton = document.querySelector('#close-footer-button');
const repositoryList = document.querySelector('#repository-list');
const organizationList = document.querySelector('#organization-list');
const selectedOrgImage = document.querySelector('#selected-org-image');

// state
// let newestUpdateTimestamp = null;
let availableOrganizations = [];
let availableRepositories = [];
const urlRepository = new URLSearchParams(window.location.search).get("repository");
let selectedOrganization = null;
let selectedRepository = null;
let selectedIsUser = null;

// const pollIntervalId = setInterval(() => onPoll(), POLL_INTERVAL);
// async function onPoll() {
//   const firstChildBeforePoll = cardsContainer.firstElementChild;

//   await paginated({ timeout: PAGE_INTERVAL }, async (page) => {
//     const pullRequests = await loadGithubPullRequests(selectedRepository, page);
//     const newPullRequests = pullRequests.filter(pullRequest => new Date(pullRequest.updated_at) > newestUpdateTimestamp);
//     const newlyMergedPullRequests = await getMergedPullRequestsWithReviews(newPullRequests);
//     updateLoadingState(newlyMergedPullRequests);

//     for (const { pullRequest, reviews } of newlyMergedPullRequests) {
//       const card = createPullRequestCard(reviews, pullRequest);
//       insertComponentBefore(cardsContainer, firstChildBeforePoll, card);
//     }

//     return newPullRequests.length === GITHUB_PAGE_SIZE;
//   });
// }

onPageLoad();
async function onPageLoad() {
  closeFooterButton.addEventListener('click', () => {
    footer.classList.add('hidden');
  });

  document.github.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  document.github.organization.addEventListener('focus', () => {
    document.github.organization.select();
  });

  document.github.repository.addEventListener('focus', () => {
    document.github.repository.select();
  });

  const res = await fetch('/api/check');
  if (!res.ok) location.pathname = '/auth/login';

  availableOrganizations = await loadGithubOrganizations();
  for (const org of availableOrganizations) {
    appendComponent(organizationList, Organization(org))
  }

  selectedOrganization = urlRepository?.split('/')[0];
  if (urlRepository && availableOrganizations.some(org => org.name === selectedOrganization)) {
    selectedRepository = urlRepository;
    selectedOrganization = urlRepository?.split('/')[0];
    const org = availableOrganizations.find(org => org.name === selectedOrganization)
    selectedIsUser = org?.type === "User";
    selectedOrgImage.src = org.avatar_url;
    document.github.repository.value = selectedRepository.split('/')[1];
    document.github.organization.value = selectedOrganization;
  }
  else {
    selectedRepository = null;
    selectedOrganization = availableOrganizations[0].name;
    selectedIsUser = availableOrganizations[0]?.type === "User";
    selectedOrgImage.src = availableOrganizations[0]?.avatar_url;
    document.github.repository.value = selectedRepository;
    document.github.organization.value = selectedOrganization;
  }

  document.github.organization.style.width = Math.max(document.github.organization.value?.length + 2, 6) + "ch";
  document.github.repository.style.width = Math.max(document.github.repository.value?.length + 2, 6) + "ch";

  availableRepositories = await loadGithubRepositories(selectedIsUser ? undefined : selectedOrganization);
  for (const repo of availableRepositories) {
    appendComponent(repositoryList, Repository(repo))
  }

  document.github.organization.addEventListener('input', async () => {
    document.github.organization.style.width = Math.max(document.github.organization.value?.length + 2, 6) + "ch";

    if (
      availableOrganizations.some(org => org.name === document.github.organization.value) &&
        selectedOrganization !== document.github.organization.value
    ) {
      selectedRepository = null;
      selectedOrganization = document.github.organization.value;
      const org = availableOrganizations.find(org => org.name === selectedOrganization)
      selectedIsUser = org?.type === "User";
      selectedOrgImage.src = org.avatar_url;
      document.github.repository.value = selectedRepository;

      window.history.replaceState(
        null, 
        document.title, 
        document.location.href.split('?')[0]
      );

      cardsContainer.innerHTML = `
        <div id="loading-indicator" class="p-4 bg-slate-200 rounded shadow-2xl border border-slate-300">
          <figure class="w-96 rounded-sm bg-slate-800"><img class="h-full w-full" src="https://thumbs.gfycat.com/BrightConcernedHapuku-size_restricted.gif"/></figure>
          <figcaption class="w-96 pt-2 break-words text-slate-600 leading-tight text-lg">Select a repository and WALL-E will load your pull requests :D</figcaption>
        </div>
      `;

      loadingIndicator = document.querySelector('#loading-indicator');
      repositoryList.innerHTML = '';

      availableRepositories = await loadGithubRepositories(selectedIsUser ? undefined : selectedOrganization);
      for (const repo of availableRepositories) {
        appendComponent(repositoryList, Repository(repo))
      }
    }
  });

  document.github.repository.addEventListener('input', async () => {
    document.github.repository.style.width = Math.max(document.github.repository.value?.length + 2, 6) + "ch";

    if (
      availableRepositories.some(repo => repo.full_name === `${selectedOrganization}/${document.github.repository.value}`) &&
        selectedRepository !== `${selectedOrganization}/${document.github.repository.value}`
    ) {
      selectedRepository = `${selectedOrganization}/${document.github.repository.value}`;
      window.history.replaceState(
        null, 
        document.title, 
        document.location.href.split('?')[0] + '?repository=' + encodeURIComponent(selectedRepository)
      );

      cardsContainer.innerHTML = `
        <div id="loading-indicator" class="p-4 bg-slate-200 rounded shadow-2xl border border-slate-300">
          <figure class="w-96 rounded-sm bg-slate-800"><img class="h-full w-full" src="https://thumbs.gfycat.com/BrightConcernedHapuku-size_restricted.gif"/></figure>
          <figcaption class="w-96 pt-2 break-words text-slate-600 leading-tight text-lg">Select a repository and WALL-E will load your pull requests :D</figcaption>
        </div>
      `;

      loadingIndicator = document.querySelector('#loading-indicator');
      await showPullRequests();
    }
  });

  if (selectedRepository) await showPullRequests();
}

async function showPullRequests() {
  const pullRequests = await loadGithubPullRequests(selectedRepository, 1);

  if (pullRequests.length === 0) {
    updateLoadingState();
    appendComponent(
      cardsContainer, 
      `<div class="p-4 bg-slate-200 rounded shadow-2xl border border-slate-300">
        <figure class="w-96 rounded-sm bg-slate-800"><img class="h-full w-full" src="https://media3.giphy.com/media/ncU3bkZ5ghDlS/giphy.gif"/></figure>
        <figcaption class="w-96 pt-2 break-words text-slate-600 leading-tight text-lg">It seems like ${selectedRepository} does not have any pull requests yet 👀</figcaption>
      </div>`
    );
    return;
  }

  const mergedPullRequests = await getMergedPullRequestsWithReviews(pullRequests);
  updateLoadingState(mergedPullRequests);

  for (const { pullRequest, reviews } of mergedPullRequests) {
    const card = createPullRequestCard(reviews, pullRequest);
    appendComponent(cardsContainer, card);
  }

  updateLoadingState();
}

function updateLoadingState() {
  if (!loadingIndicator.classList.contains('hidden')) {
    loadingIndicator.classList.add('hidden');
  }
  // const newestUpdateOfPageTimestamp = new Date(newlyMergedPullRequests[0].pullRequest.updated_at);
  // if (newestUpdateOfPageTimestamp > newestUpdateTimestamp) {
  //   newestUpdateTimestamp = newestUpdateOfPageTimestamp;
  // }
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
    pullRequest => loadGithubPullRequestReviews(selectedRepository, pullRequest.number)
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
