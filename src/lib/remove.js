let browser;
let logger;
let data;
let currentPage = 1;
let totalPage = 0;
module.exports =  async function remove(_browser, _data, _logger) {
    browser = _browser;
    logger = _logger;
    data = _data;

    const page =  await browser.newPage();
    logger.logInfo('--开始删除产品--------')
    initEvent(page);  
    // 登录
    await login(page, data);
    logger.logInfo('login successfully!')
    // 打开菜单
    await openMenu(page);
    logger.logInfo('open menu successfully!')
    // 获取总页数
    totalPage = await getTotalPage(page);
    // 处理第一页
    await query(page);
}
// bschen0410@163.com/wsfreetchc2352311
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
// 获取总页码
async function getTotalPage(page) {
    let totalPage = 0;
    // 查询总页数(Total 1165 records)
    const totalCount = await page.$$eval('.page-link', nodes => {
        for(let i = 0; i< nodes.length; i++) {
            let innerText = nodes[i].innerText;
            if(innerText.indexOf('Total') === 0){
                const reg = /[0-9]+/g;
                return innerText.match(reg)[0];
            }
        }
        return null;
    })
    if(totalCount) {
        totalPage = Math.ceil(totalCount/30);
    }
    return totalPage;
}
// 删除元素，删除元素之后会刷新页面，每次只能删除一个
async function query(page) {
    // const products = await page.$$('input[id^="editEndTime"]');
    const cards = await page.$$('.row .card');
    let hasTarget = false;
    for(let i = 0; i< cards.length; i++) {
        const card = cards[i];
        // 检索status
        // 检索createTime
        const createTime = await card.$eval('.table',  node => {
            const status = $(node).find('.badge')[0].innerText;
            var value = $(node).find('td:last')[0].innerText;
            return status === 'approved' ? value : '';
        } );
        if(createTime.indexOf(data.date) === 0) {
            hasTarget = true;
            logger.logInfo(`--找到元素${createTime},点击删除按钮`)
            // 点击删除按钮
            const deleteBtn = await card.$('.btn-danger');
            await deleteBtn.click()
        }  
    }
    if(!hasTarget){
        logger.logInfo(`第${currentPage}页没有找到目标元素`)
        await queryNext(++currentPage)
    }
}
async function queryNext(pageNum) {
    currentPage = pageNum;
    if(currentPage > totalPage) return;
    const page = await browser.newPage();
    logger.logInfo(`---正在访问第${currentPage}页`);
    initEvent(page); 
    await page.goto(`https://www.savesoo.com/seller/review_products?pageNo=${currentPage}`);
    await query(page)
}
function initEvent(page) {
    page.on('dialog', async dialog => {
        let success = false;
        const message = await dialog.message();
        if(message === 'Are you sure?') {
            await dialog.accept()
        }else if(message === 'Delete success!'){
            success = true;
            await dialog.accept();
            logger.logInfo('Delete product successfylly!');
            // 删除元素之后会刷新页面
            page = await browser.newPage();
            await queryNext(currentPage);
        }else {
            logger.logError('Delete product failed: ', message)
        }
    });
}
