
1. Set up the development environment for the KanjiLock PWA, including Next.js, React, PostgreSQL, and Python backend, ensuring all dependencies and tools are installed and configured correctly.
2. Design and implement the login page with username and password fields, ensuring secure authentication and user session management.
3. Create the main page layout with navigation options for the Quiz Page, Statistic Page, Classement Page, and Preference Page, including a persistent chatbot bubble on all pages.
4. Develop the Quiz Page with toggle buttons for quiz mode and flashcard mode, pull-down buttons for type-mode and session-box selection, and a start-pause button, ensuring the timer and answer selection functionality work as described.
5. Implement the Statistic Page with daily, weekly, and monthly progress tracking, including the number of kanji in each level and the list of kanji for revision, based on the selected type-mode and session-box.
6. Develop the Classement Page to display the best records for the user and a classement including other players, with the same pull-down buttons for type-mode and session-box selection.
7. Create the Preference Page to allow users to record their practice/quiz patterns and set user information, question number per quiz, dark-mode, font size, and database loading options.
8. Set up the database schema in PostgreSQL, including the main-table (kanji_table), session_table, logs_table, and progress_table, ensuring all necessary fields and relationships are defined.
9. Implement the backend in Python, including APIs for user authentication, quiz management, progress tracking, and chatbot integration, ensuring all endpoints are secure and efficient.
10. Integrate the chatbot with a local LLM, using Groq when deployed, and implement RAG (Retrieval-Augmented Generation) for enhanced functionality.
11. Deploy the frontend on Vercel, the database on Supabase, and the backend on Render, ensuring all services are properly configured and connected.
12. Test the application thoroughly, including unit tests, integration tests, and end-to-end tests, to ensure all features work as expected and the application is ready for production.

