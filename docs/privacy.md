# Privacy

This repository does not contain real student names, parent names, phone numbers, or a school identity.

Production rules:

- Queries are parameterized. Never build SQL by concatenating user input.
- A parent may read only the child linked to their account. Typing a student ID is a demo, not an access control.
- Medical and admin roles are not tied to one student. Parent roles are.
- Every medical-room write and every approved or acknowledged notice is an audit row.
- Use TLS to the database (`sslmode=require`) and encryption at rest on the host.
- Do not publish a roster, a diagnosis, or a disease name.
