# UGC Video Maker

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite&logoColor=white)
![EJS](https://img.shields.io/badge/EJS-templates-B4CA65)
![License](https://img.shields.io/badge/license-MIT-blue)

<img width="3092" height="933" alt="a" src="https://github.com/user-attachments/assets/01576cc4-ecae-440a-83ad-a3072dabc3f2" />

<p></p>
UGC Video Maker is a local-first web application for generating affiliate-style UGC videos with the BytePlus ModelArk Seedance 2.0 API. It is designed for creators, affiliate teams, and product marketers who need a simple workflow: upload product references, choose a creator/background reference, write a short script, and generate a ready-to-review video.

Need API access or a Seedance 2.0 package? Open the <a href="https://bit.ly/4atg2fL" target="_blank">BytePlus ModelArk console</a>

## Features

- Product, creator, and background image references
- Seedance 2.0 and Seedance 2.0 Fast model selection
- UGC presets such as product demo, unboxing, testimonial, ASMR, and affiliate selling
- Configurable language, voice tone, music, resolution, ratio, and duration
- Editable advanced prompt with visual reference mentions
- Queue-based batch generation workflow
- Local video download after generation
- Local thumbnail capture for generated videos
- History gallery with playable video modal
- SQLite persistence for settings, assets, queue items, and completed videos
- Real-person reference fallback using a subtle diagonal pattern retry

## Tech Stack

- Node.js
- Express
- EJS
- SQLite via `better-sqlite3`
- Multer for image uploads
- Sharp for reference-image preprocessing
- Vanilla JavaScript and CSS

## Requirements

- Node.js 18 or newer
- npm
- BytePlus ModelArk API key with access to Seedance 2.0

## Getting Started

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

Open the local app:

```txt
http://localhost:3000
```

For development with auto-reload:

```bash
npm run dev
```

## Configuration

Open the Settings page inside the app and configure:

- BytePlus API key
- API base URL
- Default model
- Default resolution
- Default aspect ratio

Default API base URL:

```txt
https://ark.ap-southeast.bytepluses.com/api/v3
```

The API key is stored in the local SQLite database. Do not commit the database file to a public repository.

## Project Structure

```txt
.
├── database.js          # SQLite schema and data helpers
├── server.js            # Express app entry point
├── routes/              # Page and API routes
├── services/            # Seedance API and local media helpers
├── views/               # EJS pages and partials
├── public/              # CSS, client-side JS, and static images
├── uploads/             # User-uploaded reference images
├── downloads/           # Locally saved videos and thumbnails
└── data/                # Local SQLite database
```

## Local Data

This project is intended to run locally. Uploaded assets, generated videos, thumbnails, and the SQLite database are stored on the same machine:

- `uploads/`
- `downloads/`
- `data/ugc.db`

These directories may contain private user images, generated videos, and API configuration, so they are ignored by Git.

## Notes

- Keep generated media and API credentials private when sharing the project.
- Use product images with clear lighting and minimal clutter for more consistent results.
- Review model usage and pricing in the BytePlus console before running large batches.
