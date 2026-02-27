import { BusyTexRunner, PdfLatex } from "texlyre-busytex";
import * as fs from 'fs';

async function main() {
    const runner = new BusyTexRunner({ busytexBasePath: './public/core/busytex', verbose: true });
    await runner.initialize(false); // direct mode for node maybe? Wait, texlyre-busytex might need worker or direct. Direct works in node if we load it properly. Actually let's just write a browser-based test or test it in our app.
}
main();
