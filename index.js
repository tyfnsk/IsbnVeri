const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Middleware ekleme
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Formdan gelen veriyi parsellemek için gerekli


app.set('view engine', 'ejs');

app.get('/image', async (req, res) => {
    const imageUrl = req.query.url;
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        res.set('Content-Type', 'image/jpeg');
        res.send(response.data);
    } catch (error) {
        res.status(404).send('Image not found');
    }
});

app.get('/', async (req, res) => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], });
    const page = await browser.newPage();

    const options = Array.from({ length: 104 }, (_, i) => i + 1);
    const selectedPage = 1;

    try {
        const url = "https://www.bookdepot.com/Store/Browse?Nq=25&page=1&size=96&sort=arrival_1";

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        await page.goto(url, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.caption', { timeout: 10000 });

        const dataList = await page.evaluate(() => {
            const items = [];
            const captionElements = document.querySelectorAll('.grid-item');

            captionElements.forEach(element => {
                const isbnElement = element.querySelectorAll('span, div')[5];
                const isbn = isbnElement ? isbnElement.innerText.replace("ISBN: ", "") : "ISBN Not Found";
                const title = element.querySelector('h2') ? element.querySelector('h2').innerText : "Title Not Found";
                const publisher = element.querySelectorAll('.small a')[0] ? element.querySelectorAll('.small a')[0].innerText : "Publisher Not Found";
                const price = element.querySelector('strong span') ? element.querySelector('strong span').innerText : "Price Not Found";
                const imageUrl = element.closest('.grid-item').querySelector('.thumbnail').src;
                const author = element.querySelectorAll('.caption a')[2].title;
                const format = element.querySelectorAll('.small a')[1] ? element.querySelectorAll('.small a')[1].innerText : "Publisher Not Found";
                const category = element.querySelectorAll('.small a')[2] ? element.querySelectorAll('.small a')[2].innerText : "Publisher Not Found";
                const listqty = element.querySelectorAll('.small')[4].innerText;

                items.push({
                    isbn,
                    title,
                    author,
                    publisher,
                    price,
                    format,
                    category,
                    listqty,
                    imageUrl
                });
            });

            return items;
        });

        console.log("Fetched ISBNs:", dataList);

        // Image URLs'i kendi sunucumuzdaki /image endpointine yönlendiriyoruz
        const books = dataList.map(book => {
            return {
                ...book,
                imageUrl: `http://localhost:${PORT}/image?url=${encodeURIComponent(book.imageUrl)}`
            };
        });

        res.render('index', { books, options, selectedPage });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.send("Data fetching error: " + error.message);
    } finally {
        await browser.close();
    }
});

app.post('/updatePage', async (req, res) => {
    const selectedPage = req.body.page || 1; // Seçilen sayfayı al
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();

    const options = Array.from({length: 104}, (_, i) => i + 1);

    try {
        // Seçilen sayfayı URL'ye ekle
        const url = `https://www.bookdepot.com/Store/Browse?Nq=25&page=${selectedPage}&size=96&sort=arrival_1`;

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        await page.goto(url, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.caption', { timeout: 10000 });

        const dataList = await page.evaluate(() => {
            const items = [];
            const captionElements = document.querySelectorAll('.grid-item');

            captionElements.forEach(element => {
                const isbnElement = element.querySelectorAll('span, div')[5];
                const isbn = isbnElement ? isbnElement.innerText.replace("ISBN: ", "") : "ISBN Not Found";
                const title = element.querySelector('h2') ? element.querySelector('h2').innerText : "Title Not Found";
                const publisher = element.querySelectorAll('.small a')[0] ? element.querySelectorAll('.small a')[0].innerText : "Publisher Not Found";
                const price = element.querySelector('strong span') ? element.querySelector('strong span').innerText : "Price Not Found";
                const imageUrl = element.closest('.grid-item').querySelector('.thumbnail').src;
                const author = element.querySelectorAll('.caption a')[2].title;
                const format = element.querySelectorAll('.small a')[1] ? element.querySelectorAll('.small a')[1].innerText : "Publisher Not Found";
                const category = element.querySelectorAll('.small a')[2] ? element.querySelectorAll('.small a')[2].innerText : "Publisher Not Found";
                const listqty = element.querySelectorAll('.small')[4].innerText;

                items.push({
                    isbn,
                    title,
                    author,
                    publisher,
                    price,
                    format,
                    category,
                    listqty,
                    imageUrl
                });
            });

            return items;
        });

        console.log("Fetched ISBNs:", dataList);

        // Image URLs'i kendi sunucumuzdaki /image endpointine yönlendiriyoruz
        const books = dataList.map(book => {
            return {
                ...book,
                imageUrl: `http://localhost:${PORT}/image?url=${encodeURIComponent(book.imageUrl)}`
            };
        });

        res.render('index', { books, options, selectedPage });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.send("Data fetching error: " + error.message);
    } finally {
        await browser.close();
    }

    res.render('index', { options, selectedPage, books: [] });

});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
