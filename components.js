const rotations = ['rotate-1', 'rotate-2', 'rotate-3', 'rotate-6'];
const layers = ['z-0', 'z-10', 'z-20', 'z-30', 'z-40'];
const scales = ['scale-105', 'scale-95', 'scale-100', 'scale-105'];
const corners = ['rounded-ee-none', 'rounded-es-none', 'rounded-se-none', 'rounded-ss-none'];

function Organization(org) {
  return (
    `<option value="${org.name}">
      <img src="${org.avatar_url}" class="h-6 mr-1">
      <span>${org.name}</span>
    </option>`
  );
}

function Repository(repo) {
  return (
    `<option value="${repo.full_name}">${repo.name}</option>`
  );
}

function Avatar(name, image, isReviewer, i) {
  const rotation = `${Math.random() > 0.5 ? '-' : ''}${randomArrayItem(rotations)}`;
  const corner = randomArrayItem(corners);

  return (
    `<figure class="h-8 w-8 absolute drop-shadow top-${2 + Math.floor(i / 2) * 8} right-${2 + (Math.ceil(i / 2) - Math.floor(i / 2)) * 8} ${rotation}">
      <img class="h-full w-full object-cover rounded-full ${corner} ${isReviewer ? 'border-2 border-yellow-400' : ''}" src="${image}" alt="${name}" title="${name}"/>
    </figure>`
  );
}

function Card(title, date, link, users, reviewer, gif) {
  const rotation = `${Math.random() > 0.5 ? '-' : ''}${randomArrayItem(rotations)}`;
  const layer = randomArrayItem(layers);
  const scale = randomArrayItem(scales);

  return (
    `<a href="${link}" target="_blank" class="p-4 bg-slate-200 rounded border border-slate-300 transition-all ease-in-out shadow-2xl ${layer} ${rotation} ${scale} transition-all hover:z-50 hover:rotate-0 hover:scale-125 hover:bg-slate-100"> 
      <figure class="h-56 w-56 rounded-sm bg-slate-800 relative">
        <img class="h-full w-full object-contain" src="${gif}"/>
        ${users.map((user, i) => Avatar(user.login, user.avatar_url, user.login === reviewer?.login, i)).join("")}
      </figure>
      <figcaption class="w-56 pt-2 break-words text-slate-600 font-handwriting leading-none text-xl">${title}</figcaption>
      <figcaption class="w-56 text-right break-words text-slate-400 font-handwriting leading-none text-md">${date.toLocaleDateString("uk", { day: "numeric", month: "numeric" })}</figcaption>
    </a>`
  );
}

function appendComponent(parent, outerHtml) {
  if (!parent) return outerHtml;

  const element = document.createElement('div');
  parent.appendChild(element);
  element.outerHTML = outerHtml;
  return element;
}

function insertComponentBefore(parent, child, outerHtml) {
  if (!parent) return outerHtml;

  const element = document.createElement('div');
  parent.insertBefore(element, child);
  element.outerHTML = outerHtml;
  return element;
}


function randomArrayItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}
