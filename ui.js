$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $favoritedStories = $("#favorited-articles");
  const $navWelcome = $("#nav-welcome");
  const $navUserProfile = $("#nav-user-profile");
  const $userProfile = $("#user-profile");
  const $navbar = $("nav")

  //global variables
  let storyList = null;
  let currentUser = null;
  await checkIfLoggedIn();

  // navbar event listeners
  $navbar.on('click', async function (e) {
    e.preventDefault()
    hideElements();
    if (e.target.id === "nav-all") {
      await generateStories();
      $allStoriesList.show();
    } else if (e.target.id === "nav-login") {
      $loginForm.slideToggle();
      $createAccountForm.slideToggle();
    } else if (e.target.id === "nav-submit-story") {
      $submitForm.slideToggle();
    } else if (e.target.id === "nav-favorites") {
      generateFaves();
    } else if (e.target.id === "nav-my-stories") {
      generateMyStories();
    } else if (e.target.id === "nav-user-profile") {
      $userProfile.slideToggle();
    } else if (e.target.id === "logout-btn") {
      localStorage.clear();
      location.reload();
    }
  })

  // Event listener for logging in - If successfully we will setup the user instance
  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh
    const username = $("#login-username").val(); // username and password from form
    const password = $("#login-password").val();
    const userInstance = await User.login(username, password); // call the login static method to build a user instance
    currentUser = userInstance; // sets global variable to the user instance
    loginAndSubmitForm();
  });

  // Event listener for signing up - If successfully we will setup a new user instance
  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh
    let name = $("#create-account-name").val(); // variables from form
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();
    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser; // sets global variable
    loginAndSubmitForm();
  });

  // add event listener to submit and get form input values
  $submitForm.on("submit", function (e) {
    e.preventDefault();
    let author = $("#story-author").val();
    let title = $("#story-title").val();
    let url = $("#story-url").val();
    let username = currentUser.username;
    addNewStoryFromForm(author, title, url, username);
  })

  // add event listener to favorites start - to make as favorite story
  $(".articles-container").on("click", ".star", async function (evt) {
    if (currentUser) {
      const $tgt = $(evt.target);
      const $closestLi = $tgt.closest("li");
      const storyId = $closestLi.attr("id");
      if ($tgt.hasClass("fas")) {
        await currentUser.removeFavorite(storyId);
        $tgt.closest("i").toggleClass("fas far");
      } else {
        await currentUser.addFavorite(storyId);
        $tgt.closest("i").toggleClass("fas far");
      }
    }
  });

  //Event Handler for Deleting a Single Story using the story ID 
  $ownStories.on("click", ".trash-can", async function (evt) {
    const $closestLi = $(evt.target).closest("li");
    const storyId = $closestLi.attr("id");
    await storyList.removeStory(currentUser, storyId);   // remove the story from the API       
    await generateStories();  // re-generate the story list
    hideElements();
    $allStoriesList.show(); //show story list
  });

  // generate new story 
  async function addNewStoryFromForm(author, title, url, username) {
    const story = await storyList.addStory(currentUser, {
      title,
      author,
      url,
      username,
    });
    if (verifyStory(story)) {
      newStoryLi = generateStoryHTML(story, false);
      $allStoriesList.prepend(newStoryLi);
      $submitForm.slideUp("slow");
      $submitForm.trigger("reset");
    }
  }

  // On page load, checks local storage to see if the user is already logged in.
  async function checkIfLoggedIn() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
      generateProfile()
    }
  }

  // hide the forms for logging in and signing up - update nav bar and reset forms
  function loginAndSubmitForm() {
    $loginForm.hide();
    $createAccountForm.hide();
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");
    $allStoriesList.show();
    showNavForLoggedInUser();
    syncCurrentUserToLocalStorage();
    generateProfile();
  }

  // Build a user profile based on the global "user" instance
  // show name, username, acct creation date
  function generateProfile() {
    $("#profile-name").text(`Name: ${currentUser.name}`);
    $("#profile-username").text(`Username: ${currentUser.username}`);
    $("#profile-account-date").text(
      `Account Created: ${currentUser.createdAt.slice(0, 10)}`
    );
    $navUserProfile.text(`${currentUser.username}`);
  }

  // generate storyListInstance by calling StoryList.getStories static method
  async function generateStories() {
    const storyListInstance = await StoryList.getStories();
    storyList = storyListInstance;      // update global variable
    $allStoriesList.empty();    // remove stories

    for (let story of storyList.stories) {
      if (verifyStory(story)) {
        const result = generateStoryHTML(story);
        $allStoriesList.append(result);
      }
    }
  }

  function verifyStory(story) {
    for (item in story) {
      if (story[item] === undefined || story[item] === null) {
        alert('ERROR, please refresh page to see the most updated stories')
        console.log('Verify story error')
        continue
      }
    } 
    return true
  }

  // render HTML for an individual Story instance
  function generateStoryHTML(story, isOwnStory) {
    let hostName = getHostName(story.url);
    let starType = isFavorite(story) ? "fas" : "far";
    const trashCanIcon = isOwnStory ? `<span class="trash-can"><i class="fas fa-trash-alt"></i></span>` : "";

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      ${trashCanIcon}
        <span class="star">
          <i class="${starType} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);
    return storyMarkup;
  }

  // A rendering function to build the favorites list
  function generateFaves() {
    $favoritedStories.empty();
    if (currentUser.favorites.length === 0) {
      $favoritedStories.append("<h5>No favorites added!</h5>");
    } else {
      for (let story of currentUser.favorites) {
        let favoriteHTML = generateStoryHTML(story, false, true);
        $favoritedStories.append(favoriteHTML);
      }
    }
    $favoritedStories.show();
  }

  // render all of the user's posted stories
  function generateMyStories() {
    $ownStories.empty();
    if (currentUser.ownStories.length === 0) {
      $ownStories.append("<h5>No stories added by user yet!</h5>");
    } else {
      for (let story of currentUser.ownStories) {
        let ownStoryHTML = generateStoryHTML(story, true);
        $ownStories.append(ownStoryHTML);
      }
    }
    $ownStories.show();
  }

  /* hide all elements in elementsArr */
  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $favoritedStories,
      $loginForm,
      $createAccountForm,
      $userProfile,
    ];
    elementsArr.forEach($elem => $elem.hide());
  }
  // show navbar if user is logged-in
  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $userProfile.hide();
    $(".main-nav-links, #user-profile").toggleClass("hidden");
    $navWelcome.show();
  }

  /* see if a specific story is in the user's list of favorites */
  function isFavorite(story) {
    let favStoryIds = new Set();
    if (currentUser) {
      favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));
    }
    return favStoryIds.has(story.storyId);
  }

  /* simple function to pull the hostname from a URL */
  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */
  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
