EduVault is a full-stack academic document-sharing and verification platform designed to streamline note distribution across college departments and semesters. Built using the Node.js ecosystem and Groq LLM infrastructure, EduVault automatically parses uploaded PDFs and generates real-time AI summaries while verifying document authenticity before making them accessible to students.

Key Features:
JWT-Based Authentication: Secure user signup, login, and role-based route protection for students and creators.

Smart File Uploads & Storage: Automated document handling using Multer with strict MIME-type validation for academic PDFs.

AI-Driven Content Summarization: Integrated Groq LLM pipeline (llama-3.1-8b-instant / llama-3.3-70b-versatile) to parse PDF text via pdf-parse-fork and return automated 2-sentence key topic summaries.

Categorized Repository Feed: Filter and search study materials by Department (BCA, B.Tech, etc.), Semester, and Subject.

Resilient Model Fallback Architecture: Auto-querying dynamic LLM selection mechanism to ensure zero downtime during model updates or API deprecations.

Tech Stack:
Backend: Node.js, Express.js

Database: MongoDB (Mongoose ORM)

AI & Parsing: Groq SDK, pdf-parse-fork

Authentication & Security: JSON Web Tokens (JWT), Bcrypt.js, CORS, Dotenv