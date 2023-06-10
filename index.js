const POLL_INTERVAL = 1 * 60 * 1000;
const DEFAULT_GIF = 'https://i.pinimg.com/originals/b2/78/a5/b278a5a006340b8946457552adec56c5.gif';

const cardsContainer = document.querySelector('#cards');
let loadingIndicator = document.querySelector('#loading-indicator');
const footer = document.querySelector('#footer');
const closeFooterButton = document.querySelector('#close-footer-button');
const repositoryList = document.querySelector('#repository-list');
const organizationList = document.querySelector('#organization-list');
const selectedOrgImage = document.querySelector('#selected-org-image');

// state
let availableOrganizations = [];
let availableRepositories = [];
const urlRepository = new URLSearchParams(window.location.search).get("repository");
let selectedOrganization = null;
let selectedRepository = null;
let selectedIsUser = null;
let newestMergedPr = null;

const pollIntervalId = setInterval(() => onPoll(), POLL_INTERVAL);
async function onPoll() {
  const pullRequests = await loadGithubPullRequests(selectedRepository, 1);
  const mergedPullRequests = getMergedPullRequests(pullRequests);
  
  const currentNewestPrIdx = mergedPullRequests.findIndex(pr => pr.number === newestMergedPr.number);
  if (currentNewestPrIdx === 0) return;

  const newlyMergedPrs = mergedPullRequests.slice(0, currentNewestPrIdx);
  newestMergedPr = mergedPullRequests[0];
  
  const mergedPullRequestsWithReviews = await getMergedPullRequestsWithReviews(newlyMergedPrs);
  const firstChildBeforePoll = cardsContainer.firstElementChild;

  for (const { pullRequest, reviews } of mergedPullRequestsWithReviews.reverse()) {
    const card = createPullRequestCard(reviews, pullRequest);
    insertComponentBefore(cardsContainer, firstChildBeforePoll, card);
  }
}

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
    selectedOrgImage.classList.remove('hidden');
    document.github.repository.value = selectedRepository.split('/')[1];
    document.github.organization.value = selectedOrganization;
  }
  else {
    selectedRepository = null;
    selectedOrganization = availableOrganizations[0].name;
    selectedIsUser = availableOrganizations[0]?.type === "User";
    selectedOrgImage.src = availableOrganizations[0]?.avatar_url;
    selectedOrgImage.classList.remove('hidden');
    document.github.repository.value = selectedRepository;
    document.github.organization.value = selectedOrganization;
  }

  document.github.organization.style.width = Math.max(document.github.organization.value?.length + 3, 7) + "ch";
  document.github.repository.style.width = Math.max((document.github.repository.value?.length || 10) + 3, 7) + "ch";

  availableRepositories = await loadGithubRepositories(selectedIsUser ? undefined : selectedOrganization);
  for (const repo of availableRepositories) {
    appendComponent(repositoryList, Repository(repo))
  }

  document.github.organization.addEventListener('input', async () => {
    document.github.organization.style.width = Math.max(document.github.organization.value?.length + 3, 7) + "ch";

    if (selectedOrganization && !document.github.organization.value) {
      selectedRepository = null;
      selectedOrganization = null;
      selectedIsUser = null;
      selectedOrgImage.classList.add('hidden');
      document.github.repository.value = selectedRepository;
    }

    if (
      availableOrganizations.some(org => org.name === document.github.organization.value) &&
        selectedOrganization !== document.github.organization.value
    ) {
      selectedRepository = null;
      selectedOrganization = document.github.organization.value;
      const org = availableOrganizations.find(org => org.name === selectedOrganization)
      selectedIsUser = org?.type === "User";
      selectedOrgImage.src = org.avatar_url;
      selectedOrgImage.classList.remove('hidden');
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
    document.github.repository.style.width = Math.max((document.github.repository.value?.length || 10) + 3, 7) + "ch";

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
  const pullRequests = await loadGithubPullRequests(selectedRepository, 2);
  const mergedPullRequests = getMergedPullRequests(pullRequests);
  newestMergedPr = mergedPullRequests[0];

  if (mergedPullRequests.length === 0) {
    updateLoadingState();
    appendComponent(
      cardsContainer, 
      `<div class="p-4 bg-slate-200 rounded shadow-2xl border border-slate-300">
        <figure class="w-96 rounded-sm bg-slate-800"><img class="h-full w-full" src="https://media3.giphy.com/media/ncU3bkZ5ghDlS/giphy.gif"/></figure>
        <figcaption class="w-96 pt-2 break-words text-slate-600 leading-tight text-lg">It seems like ${selectedRepository} does not have any merged pull requests yet 👀</figcaption>
      </div>`
    );
    return;
  }

  updateLoadingState();
  const mergedPullRequestsWithReviews = await getMergedPullRequestsWithReviews(mergedPullRequests);
  for (const { pullRequest, reviews } of mergedPullRequestsWithReviews) {
    const card = createPullRequestCard(reviews, pullRequest);
    appendComponent(cardsContainer, card);
  }
}

function updateLoadingState() {
  if (!loadingIndicator.classList.contains('hidden')) {
    loadingIndicator.classList.add('hidden');
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

function getMergedPullRequests(pullRequests) {
  return pullRequests
    .filter(pullRequest => pullRequest.merged_at)
    .sort((a, b) => new Date(b.merged_at) - new Date(a.merged_at));
}

async function getMergedPullRequestsWithReviews(mergedPullRequests) {
  const reviewsPerPullRequest = await Promise.all(mergedPullRequests.map(
    pullRequest => loadGithubPullRequestReviews(selectedRepository, pullRequest.number)
  ));

  return mergedPullRequests.map((pullRequest, idx) => ({ pullRequest, reviews: reviewsPerPullRequest[idx] }));
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
