
![Made-With-React](https://img.shields.io/badge/Made_with-React-informational?style=for-the-badge&logo=react) ![Made-With-NodeJS](https://img.shields.io/badge/Made_with-NodeJS-informational?style=for-the-badge&logo=javascript) ![Made-With-Material_UI](https://img.shields.io/badge/Made_with-Material_UI-informational?style=for-the-badge&logo=material-ui)

1. **React** for Frontend and **Express** as Middleware.
2. **Material UI** and **React-Bootstrap** for styling.

## Quick Start

Clone the repository and do following:

**NOTE** : You can see the sample .env.instead which will contain the environment variables. Replace the values with your own KEYS/SECRETS/URLs and rename the file to .env from .env.instead

```bash
# Install dependencies for server
npm install

# Install dependencies for client
npm run client-install

# Run the client & server with concurrently
npm run dev

# Run the Express server only
npm run server

# Run the React client only
npm run client

# Server runs on http://localhost:4000 and client on http://localhost:3000
```

**Note - If you wish to change the server port number from 5000 to say port 4000, then do the following small change in package.json file of the client folder.**

<div align="center">
  <img src="./proxy-change.png" width=100%/>
</div>


## Credits :

Referred to [this](https://www.sitepoint.com/google-auth-react-express/) for setting up Google Sign-in

<h3 align="center"><b>Developed with love by Sudhanshu Ranjan</b></h1>
