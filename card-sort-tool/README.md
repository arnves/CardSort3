# Card Sorting Tool. 
The tool is implemented in React and with a Node.js backend that uses sqlite as the database. 
The client code is in the client directory, and the server code is in the server directory.

## Background
The tool is for sorting piles of cards (cards are like sticky notes, and are defined by a title and short text, and should have a unique id.) The user must be able to sort cards into different piles.  A card sorting process should consist of several rounds, and the results from one round should be possible to move from one round to another, for example by moving some piles to the next round, but not the others.  The card sorting sessions should be continously updated on the backend.

## Description of the main user interface:
* On the top - a title bar with the title "CardSortTool"
* A menu bar with buttons for "new category" and "export data" - a dropdown to select from available sorting sessions, and to the right a logout button.
* The rest of the windows should be filled with The main sorting area, where categoryBoxes are created, and to the right a scroll-list of cards to sort - the SortingList

An unauthenticated user should only see the Title bar and a login-page. When logged in, the normal interface should be visible.

### Behavior for cards: 
A card should contain an id, a title, text and a category. In order to save screen space, cards should normally show only the title, but when the user hovers over the card, the card should expand to show the whole text, displacing the other objects.
CardList: The list of cards should come up in a scrollable list on the right side of the window, leaving a larger area for the piles of cards. 
Sorting area: Should form the largest space in the interface.  A button in the top menu should allow for creating new categories. Creating a category should lead to asking about the name of the category. Creating a new category should create a new CategoryBox in the Sorting area. 
It should be possible to drag and drop cards from the SortingList to a category box. It should be possible to drag cards both to a specific category box and back to the SortingList as well as between category boxes. When dragging from the cardlist, the card should be removed from the cardlist and added to the category it is dropped on. When dragging from a category, the card should be removed from the category and added to the cardlist or the new category.
When dragging, make CSS code to highlight that the user is hovering over the category or cardlist.
When categories are created, add "New category" as the name. Add a small pencil next to the name, when the user clicks the pencil, the name should be highlighted and ready for a new name. To the right of the card, add a trash can icon. When the icon is clicked, the user should be asked if he wants to delete the category, or cancel. If delete, move all cards from the category back to the sortinglist. 

## Data structures
  The code needs to hold the state of the cards and their placement, either in the sorting area, a category box or the cardlist.  
Data export: A button in the menu should allow for the list of cards to be exported. The export should contain the list of all cards including the category they belong to, identified by name.

Saving state - the frontend should continuously update the session data in the backend.

We also need a backend for storing and synchronizing the card states:
* Use sqlite as the backend database. Use prepared statements for all database queries to prevent SQL injection.
* Implement a backend api in node.js. Implement proper CORS settings to secure the API.
* Add users and authentication and session management using JWT.
* a session should be one user editing one "sorting session"
* a "sorting session" should contain a set of cards and categories.
* A user should be able to create a new session, and switch between other sessions that they have created.
* An admin user should be able to add new users and give them a password. An admin user should be able to modify what user owns what "sorting session".  Add an admin user with the "admin" default password to the default database.
* The database should contain "Card sets", containing sets of cards the user can import into a session. A starting set of cards - called "Example cards" should be provisoned to the default database.
* Implement proper error handling and input validation on both frontend and backend.
* Implement a single CSS file for the frontend project.


## Tool for external sorting
The app provides an interface for external users to participate in a card sorting session. The interface allows only sorting cards in a single session explicitly shared with an external user without a user account in the database and should only be valid for a specific time period, and support an optional password.

For the server side :
a separate, unauthenticated endpoint for the api that exposes functionality similar to the CartSortingArea with the possibility to create categories and moving cards - an external sorting api.  
For the Client side :
The user should reach the UI by following a unique URL containing the random guid of the shared sorting session. The UI and api should only be available if the guid is correct and the access is between valid_from and valid_to and the optional password is validated.
Reuse the components for sorting if possible, otherwise create new based on the existing code.
If the Sharing session has a password, prompt the user for a password, when arriving at the page. expose an endpoint for validating the sharing password, and if it validates, add the password to a hidden field and send it along with all submissions to the external sorting api. If the password doesnt validate, reprompt the user. 
Add a button "Submit" - prompt the user if the would like to submit the sorting session. When the user submits the session,  submitted should be set to true, and valid_to should be set to the current datetime to prevent new submissions.

# Database structure and logic

Card_sets:
* id: unique id for the card set
* name: Name for the card set
Card_set_items:  Predefined sets of cards, to be imported into a session.
* id : unique id for a card
* card-set_id: unique id for a card set
* title: Title text of a card
* text: Text of a card
Session: A session will have:
* id: a unique id for the session 
* "created_by", the user that created the session
* session-card-list-id:  key to a session card list
Session_card_list
* id: unique id for the session card list
* category: category of card
* card_id : id of card
* title: title text of card
* text: text of card
Session_categories
* id: unique id for the session category
* name: name of category
* session_id: key to a session
* session_card_list_id: key to a session card list


shared_sessions :
	  * id : id of the sharing session - must be a random guid
	  * session_id : link to the session_id in the session_card_list
	  * valid_from: datetime start of validity for sharing
	  * valid_to: datetime end of validity for sharing
	  * password: optional password for the sharing session
	  * submitted: a true/false if the user submitted the shared session.