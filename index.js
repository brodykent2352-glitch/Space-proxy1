import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import http from 'node:http';
import path from 'node:path';
import { hostname } from 'node:os';
import chalk from 'chalk';
import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import { epoxyPath } from '@mercuryworkshop/epoxy-transport';
import { libcurlPath } from '@mercuryworkshop/libcurl-transport';
import { baremuxPath } from '@mercuryworkshop/bare-mux/node';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';
import routes from './src/routes.js';

const server = http.createServer();
const app = express();
const __dirname = process.cwd();
const PORT = process.env.PORT || 6060;


// Enable compression for better speed
app.use(compression());

// CORS and security headers
app.use(cors());
app.use(helmet({
	contentSecurityPolicy: false, // Set to true and configure if you want CSP
	crossOriginResourcePolicy: { policy: "cross-origin" },
	referrerPolicy: { policy: "strict-origin-when-cross-origin" },
	frameguard: { action: "deny" },
	hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
// Prevent X-Powered-By header
app.disable('x-powered-by');

// Parse requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static file serving with cache-control for better performance
const staticOptions = { maxAge: '7d', setHeaders: (res) => {
	res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
}};
app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use('/epoxy/', express.static(epoxyPath, staticOptions));
app.use('/@/', express.static(uvPath, staticOptions));
app.use('/libcurl/', express.static(libcurlPath, staticOptions));
app.use('/baremux/', express.static(baremuxPath, staticOptions));

// Main routes
app.use('/', routes);

// Error handler for better debugging and compatibility
app.use((err, req, res, next) => {
	console.error('Server error:', err);
	res.status(500).json({ error: 'Internal Server Error' });
});

server.on('request', (req, res) => {
	app(req, res);
});

server.on('upgrade', (req, socket, head) => {
	if (req.url.endsWith('/wisp/')) {
		wisp.routeRequest(req, socket, head);
	} else {
		socket.end();
	}
});

server.on('listening', () => {
	const address = server.address();
	const theme = chalk.hex('#8F00FF');
	const host = chalk.hex('0d52bd');
	console.log(
		chalk.bold(
			theme(`
	`)
		)
	);
	console.log(
		`  ${chalk.bold(host('Local System:'))}            http://${address.family === 'IPv6' ? `[${address.address}]` : address.address}${address.port === 80 ? '' : ':' + chalk.bold(address.port)}`
	);

	console.log(
		`  ${chalk.bold(host('Local System:'))}            http://localhost${address.port === 8080 ? '' : ':' + chalk.bold(address.port)}`
	);

	try {
		console.log(
			`  ${chalk.bold(host('On Your Network:'))}  http://${hostname()}${address.port === 8080 ? '' : ':' + chalk.bold(address.port)}`
		);
	} catch (err) {
		// can't find LAN interface
	}

	if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
		console.log(
			`  ${chalk.bold(host('Replit:'))}           https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
		);
	}

	if (process.env.HOSTNAME && process.env.GITPOD_WORKSPACE_CLUSTER_HOST) {
		console.log(
			`  ${chalk.bold(host('Gitpod:'))}           https://${PORT}-${process.env.HOSTNAME}.${process.env.GITPOD_WORKSPACE_CLUSTER_HOST}`
		);
	}

	if (
		process.env.CODESPACE_NAME &&
		process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
	) {
		console.log(
			`  ${chalk.bold(host('Github Codespaces:'))}           https://${process.env.CODESPACE_NAME}-${address.port === 80 ? '' : address.port}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
		);
	}
});

server.listen(PORT);
