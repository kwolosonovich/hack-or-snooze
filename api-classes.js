const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

// class used to generate individual story instances - fetch, add, and remove stories
class StoryList {      
  constructor(stories) {
    this.stories = stories;
  }

 // call to generate a new StoryList
 // call API, build array of story instances, create and return a storyList from arra
  static async getStories() {
    // query the /stories endpoint (no auth required)
    const response = await axios.get(`${BASE_URL}/stories`);
    // turn the plain old story objects from the API into instances of the Story class
    const stories = response.data.stories.map(story => new Story(story));
    // build an instance of our own class using the new array of stories
    const storyList = new StoryList(stories);
    verifyStories()
    return storyList;
  }


   // create POST request to /stories, add story to list
   // return new story object 
   async addStory(user, newStory) {
    let reqBody = {
      token: user.loginToken, //token is for the current instance of user
      story: newStory,  // title, author and url
    }

    const response = await axios({
      method: "POST", 
      url: `${BASE_URL}/stories`,
      data: reqBody,
    })

    newStory = new Story(response.data.story); //create a new story from Story class
    this.stories.unshift(newStory);      // prepend story to story list
    user.ownStories.unshift(newStory); // prepend story to user's list
    
    return newStory
  }


   // delete request to remove a story (using the story ID) and update StoryList and user's list of stories
  async removeStory(user, storyId) {
    await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: "DELETE",
      data: {
        token: user.loginToken
      },
    });

    this.stories = this.stories.filter(story => story.storyId !== storyId);
    user.ownStories = user.ownStories.filter(s => s.storyId !== storyId
    );
  }
}

// The User class for current user with  helper methods to signup (create), login, and getLoggedInUser
class User {
  constructor(userObj) {
    this.username = userObj.username;
    this.name = userObj.name;
    this.createdAt = userObj.createdAt;
    this.updatedAt = userObj.updatedAt;
    // these are all set to defaults, not passed in by the constructor
    this.loginToken = "";
    this.favorites = [];
    this.ownStories = [];
    console.log("User created");
  }

  // create a new user by generating POST request to API 
  static async create(username, password, name) {
    console.log("create");
    const response = await axios.post(`${BASE_URL}/signup`, {
      user: {
        username,
        password,
        name,
      },
    });

    // build a new User instance from the API response
    const newUser = new User(response.data.user);
    // attach the token to the newUser instance for convenience
    newUser.loginToken = response.data.token;
    return newUser;
  }


  // log in user using username and password - create a user instance
  static async login(username, password) {
    console.log("login");
    const response = await axios.post(`${BASE_URL}/login`, {
      user: {
        username,
        password,
      },
    });

    // build a new User instance from the API response
    const existingUser = new User(response.data.user);

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map((s) => new Story(s));
    existingUser.ownStories = response.data.user.stories.map((s) => new Story(s));

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = response.data.token;

    return existingUser;
  }


// GET request to get instance of current user - uses the token and username to make API request
  static async getLoggedInUser(token, username) {
    if (!token || !username) return null;  
    
    const response = await axios.get(`${BASE_URL}/users/${username}`, {
      params: {
        token,
      },
    });

    // instantiate the user from the API information
    const existingUser = new User(response.data.user);

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = token;

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map(
      (s) => new Story(s)
    );
    existingUser.ownStories = response.data.user.stories.map(
      (s) => new Story(s)
    );
    return existingUser;
  }

  async retrieveDetails() {
    const response = await axios.get(`${BASE_URL}/users/${this.username}`, {
      params: {
        token: this.loginToken,
      },
    });

// update all of the user's properties from the API response
    this.name = response.data.user.name;
    this.createdAt = response.data.user.createdAt;
    this.updatedAt = response.data.user.updatedAt;
    this.favorites = response.data.user.favorites.map((s) => new Story(s));
    this.ownStories = response.data.user.stories.map((s) => new Story(s));
    return this;
  }

// add a story to the user's favorites and update API using the story ID
  addFavorite(storyId) {
    return this._toggleFavorite(storyId, "POST");
  }


// remove a favorite story form user's favorites and update API using the story ID
  removeFavorite(storyId) {
    return this._toggleFavorite(storyId, "DELETE");
  }


// helper method to send a POST or DELETE request to API
  async _toggleFavorite(storyId, httpVerb) {
    await axios({
      url: `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
      method: httpVerb,
      data: {
        token: this.loginToken,
      },
    });

    await this.retrieveDetails();
    return this;
  }


// updates the user's data by sending a PATCH request to API 
  async update(userData) {
    const response = await axios({
      url: `${BASE_URL}/users/${this.username}`,
      method: "PATCH",
      data: {
        user: userData,
        token: this.loginToken,
      },
    });

    // update a user's name
    this.name = response.data.user.name;
    return this;
  }

  
// send DELETE request to API to remove the user 
  async remove() {
    await axios({
      url: `${BASE_URL}/users/${this.username}`,
      method: "DELETE",
      data: {
        token: this.loginToken,
      },
    });
  }
}

// class to generate a story
class Story {
  constructor(storyObj) {
    Object.assign(this, storyObj)
  }

// sent a PATCH request to APU to update a single story with the data (information to update)
  async update(user, storyData) {
    const response = await axios({
      url: `${BASE_URL}/stories/${this.storyId}`,
      method: "PATCH",
      data: {
        token: user.loginToken,
        story: storyData,
      },
    });

    const { author, title, url, updatedAt } = response.data.story;
    this.author = author;
    this.title = title;
    this.url = url;
    this.updatedAt = updatedAt;

    return this;
  }
}