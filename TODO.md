# Planify TODOs 
### (Probably arranged in order of importance)
- Add a limit for canceling the amount of times a user can cancel a generation before it starts actually counting toward their quota
  - Prevents users from wasting system resources
- If the user asks the AI to edit a pre-task, the AI should also be able to change tasks associated with that pre-task (not any other task)
  - Maybe link tasks to a pre-task
- Make the review questions in the wizard have an option to be multiple choice

- Make the wizard ask if the user wants to recreate their review questions if they updated their notes after they were generated
- Add bfcache handle to wizard
- Make the placeholder say "Do you already have a rough idea of a plan?"
- Make the wizard review questions heading scroll area auto scroll to current question and not have the scrollar visible
- Make the wizard initially retrieve quota once and update remaining quota (for review questions and schedule) on the client. Initially meaning on every page refresh. 
- Don't share the choiceNum with the AI when giving review questions to the schedule planner AI.
- While the AI is loading (not thinking or generating), it should say funny things that a normal human would do to avoid answering.
  Examples:
  - Rereading request
  - Taking a sip of coffee
  - Looking for a snack
  - Checking the wifi router
  - Adjusting chair height
  - Fidgeting with pen nervously
  - Cleaning eyeglasses