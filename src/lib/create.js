const xlsx = require('node-xlsx'); 
const fs = require('fs');
let browser;
let logger;
let dataSource = [];
let currIndex = -1;
let currPage;
let data;
const reg = /\.xls|\.xlsx$/;
module.exports =  async function create(_browser, _data, _logger) {
    browser = _browser;
    logger = _logger;
    data = _data;

    const page =  await browser.newPage();
    // 读取数据源
    try{
        const paths = fs.readdirSync(data.filePath)
        paths.forEach(function (path) {
           if(reg.test(path)){
            dataSource = dataSource.concat(readExcel(data.filePath +'\\'+path))
           }
        })
        if(dataSource.length === 0) {
            logger.logError('Excel 数据为空!');
            return;
        }
        logger.logInfo('Read excel successfully!', dataSource);
    }catch(err) {
        logger.logError('Read excel failed!');
        logger.logError(err.toString());
        return;
    }     
    // 登录
    await login(page, data);
    logger.logInfo('login successfully!');
    await page.waitFor(3000);

    await doCreate();
}

async function login(page, data){
    await page.goto('https://www.savesoo.com/seller/login');
    // 输入账号bschen0410@163.com
    await page.focus('#email');
    await page.type('#email', data.email);
    // 输入密码wsfreetchc2352311
    await page.focus('input[type="password"]');
    await page.type('input[type="password"]', data.password);
    // 提交
    await page.tap('button[type="submit"]');
}
// 打开菜单
async function openMenu(page) {
    await page.goto('https://www.savesoo.com/seller/review_products');
}
function readExcel(filePath) {
    const result = [];
    var sheets = xlsx.parse(filePath);
    const arr = sheets[0].data;
    for(let i = 1; i< arr.length; i++) {
        const cols = arr[i];
        let row = {
            country: cols[1],
            name: cols[2],
            description: cols[3],
            category: cols[4],
            productUrl: cols[5],
            image: cols[6],
            asin: cols[7],
            keyword: cols[8],
            fullPrice: cols[9]+'',
            reviewerPrice: cols[10]+'',
            providePoints: cols[11]+'',
            transaction: cols[12],
        }
        if(row.asin)  result.push(row)
    }
    return result;
}
// 创建

async function doCreate() {
    currIndex ++;
    if(currIndex >= dataSource.length) {
        logger.logInfo('Create product completed!');
        return;
    }
    const data = dataSource[currIndex];
    if(currPage) await currPage.close();
    const page =  await browser.newPage();
    currPage = page;
    page.on('dialog', async dialog => {
        const message = dialog.message();
        if(message === 'Are all the information correct? And save it?'){
            await dialog.accept()
        }else if(message === 'Success!'){
            await dialog.accept()
            logger.logInfo(`${currIndex+1}. Create product ${data.asin} successfylly!`)
            doCreate()
        }else {
            await dialog.accept()
            logger.logError(`Create product ${data.asin} failed: ${message}` )
            // logger.logInfo(JSON.stringify(data))
            doCreate()
        }
    });
    logger.logInfo(`--开始上传第${currIndex+1}个产品：${data.asin}`)
    // 打开菜单
    await openMenu(page);

    await page.tap('button[data-action="Create"]');
    await page.waitForSelector('#dealProductModal option[value="12"]');
    
    await setImage(page, data);
    await setForm(page, data);
    await checkForm(page, data)
    
    await page.tap('#dealProductModal button[type="submit"]')
    return true;
}
async function setForm(page, data) {
    page.waitFor(3000);
    await page.focus('select[name="countryId"]');
    await page.select('select[name="countryId"]', countryMap[data.country]);
    await page.focus('input[name="name"]');
    await page.type('input[name="name"]', data.name);
    await page.focus('textarea[name="description"]');
    await page.type('textarea[name="description"]', data.description);
    await page.focus('select[name="categoryId"]');
    await page.select('select[name="categoryId"]', categoryMap[data.category]);
    await page.focus('input[name="productUrl"]');
    await page.type('input[name="productUrl"]', data.productUrl);
    await page.focus('input[name="asin"]');
    await page.type('input[name="asin"]', data.asin);
    await page.focus('input[name="keyword"]');
    await page.type('input[name="keyword"]', data.keyword);
    await page.focus('input[name="fullPrice"]');
    await page.type('input[name="fullPrice"]', data.fullPrice);
    await page.focus('input[name="reviewerPrice"]');
    await page.type('input[name="reviewerPrice"]', data.reviewerPrice);
    await page.focus('textarea[name="transactionTerms"]');
    await page.type('textarea[name="transactionTerms"]', data.transaction);
}
async function checkForm(page, data) {
    page.waitFor(3000);
    const country = await page.$eval('#dealProductModal select[name="countryId"]', node => node.value)
    if(!country) await page.type('#dealProductModal select[name="countryId"]', data.country);

    const name = await page.$eval('#dealProductModal input[name="name"]', node => node.value)
    if(!name) await page.type('#dealProductModal input[name="name"]', data.name);
    
    const description = await page.$eval('#dealProductModal textarea[name="description"]', node => node.value)
    if(!description) await page.type('#dealProductModal textarea[name="description"]', data.description);
}
async function setImage(page, item) {
    await page.$eval('#imageUrl', () => {
        $('#imageUrl')[0].style.display = 'block'
    })
    const input = await page.waitForSelector('#imageUrl');
    let imgPaths = item.image.split(/[,，]/);
    imgPaths = imgPaths.map((path)=> {
        return `${data.filePath}\\img\\${path.trim()}.jpg`
    }) 
    await input.uploadFile.apply(input, imgPaths)
    await page.$eval('#imageUrl', () => {
        $('#imageUrl').change()
    })
}
const countryMap = {
    US: '1',
    UK: '2',
    FR: '3',
    CA: '4',
    DE: '5',
    IT: '6',
    ES: '7',
    BR: '8',
    JP: '9',
    IN: '10',
    MX: '11',
    CN: '12'
}
const categoryMap = {
    'Electronics & Office': '1',
    'Cell Phones & Accessories': '2',
    "Men's Clothing & Shoes": '3',
    'Home & Garden': '4',
    'Toys, Kids & Baby': '5',
    'Beauty & Grooming': '6',
    'Beauty & Grooming': '7',
    'Jewelry': '8',
    'Sports & Outdoors': '9',
    'Adult Products': '10',
    'Other': '11',
    'Pet Supplies': '12',
    'Automotive & Industria': '13',
    'Kitchen & Dining': '14',
    'Watches': '15',
    "Women's Clothing & Shoes": '16',
    'Arts, Crafts & Sewing': '18',
    'Health & Household': '19',
    'Tools&Home improvement': '20',
}
