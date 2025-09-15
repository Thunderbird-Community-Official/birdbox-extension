/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const POPUP_WIDTH = 500;

import { createSpaceItem } from "./editSpace.js";

function unselect() {
  document.querySelector("#add-mode .card.selected")?.classList.remove("selected");
  document.getElementById("add-space-popup")?.classList.remove("attached");
}

async function clickAddSpace() {
  let details = document.getElementById("add-space-details");
  if (!details.validate()) {
    return;
  }

  let spaceData = document.querySelector(".card.selected")?._spaceData;
  if (spaceData) {
    let { teamId, targetUrl } = details.targetUrl;
    let icon = browser.runtime.getURL(`/recipes/${spaceData.recipeId}/icon.svg`);

    let data = {
      name: crypto.randomUUID().replace(/-/g, "_"),
      title: details.field("space-name"),
      url: targetUrl,
      icon: icon,
      container: details.field("space-container"),
      notifications: details.field("space-notifications"),
      startup: details.field("space-startup"),
      useragent: details.field("space-useragent"),
      recipeId: spaceData.recipeId,
      recipeConfig: spaceData.recipeConfig,
      teamId: teamId,
    };

    await browser.runtime.sendMessage({ action: "addSpace", space: data });
    createSpaceItem(data);
    unselect();
  }
}

async function clickCard(event) {
  let popup = document.getElementById("add-space-popup");
  let card = event.target.closest(".card");
  if (!card || !card._spaceData) {
    return;
  }
  unselect();

  // Positioning
  let rect = card.getBoundingClientRect();
  let left = rect.left;

  if (rect.left + POPUP_WIDTH > window.innerWidth) {
    left = rect.right - POPUP_WIDTH;
  }

  let scrollTop = document.getElementById("add-mode").scrollTop;

  popup.style.top = `${rect.bottom + scrollTop}px`;
  popup.style.left = `${left}px`;

  // Data
  card.classList.add("selected");
  popup.classList.add("attached");
  document.getElementById("add-space-details").spaceData = Object.assign({}, card._spaceData);
}

export async function loadAddSpaces() {
  let spaces = await fetch("/recipes/spaces.json").then(resp => resp.json());
  let featured = await fetch("/recipes/featured.json").then(resp => resp.json());

  let cardTemplate = document.getElementById("space-card-template");
  let allCardsContainer = document.getElementById("add-space-all-cards");
  let featuredCardsContainer = document.getElementById("add-space-featured-cards");
  let cardMap = {};

  for (let spaceData of spaces) {
    // Clone template content, then get the real element from the fragment
    const frag = cardTemplate.content.cloneNode(true);
    const cardEl = frag.firstElementChild;

    // Populate visuals
    cardEl.querySelector("img").src = browser.runtime.getURL(`/recipes/${spaceData.recipeId}/icon.svg`);
    cardEl.querySelector(".name").textContent = spaceData.title;

    // A11y and keyboard activation
    cardEl.setAttribute("tabindex", "0");
    cardEl.setAttribute("role", "button");
    cardEl.setAttribute("aria-label", spaceData.title);
    cardEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        cardEl.click();
      }
    });

    // Store data on the element
    cardEl._spaceData = spaceData;

    // Keep a map so we can build the Featured list
    cardMap[spaceData.recipeId] = cardEl;

    // Append the fragment to the DOM
    allCardsContainer.appendChild(frag);
  }

  for (let recipeId of featured) {
    let card = cardMap[recipeId].cloneNode(true);
    card._spaceData = cardMap[recipeId]._spaceData;
    featuredCardsContainer.appendChild(card);
  }
}

export async function initAddSpaces() {
  document.getElementById("add-space-all-cards").addEventListener("click", clickCard);
  document.getElementById("add-space-featured-cards").addEventListener("click", clickCard);
  document.getElementById("add-space-add-button").addEventListener("click", clickAddSpace);
  document.getElementById("add-mode").addEventListener("click", (event) => {
    if (!event.target.closest("#add-space-popup, .card.selected")) {
      unselect();
    }
  });
  window.addEventListener("keyup", (event) => {
    if (event.key == "Escape") {
      unselect();
    }
  });
  document.getElementById("edit-spaces-button").addEventListener("click", () => {
    location.hash = "#edit";
  });
}
