// const idle = 1000
// const lastDate = Date.now()
// setTimeout(() => {
//     console.log('hello')
// }, idle)

// // 4 s
// let nextDate = Date.now()
// while (nextDate - lastDate < idle + 3000) {
//     console.log(`passed time ${nextDate - lastDate}`)
//     for (let i = 0; i < 10000; i++);
//     nextDate = Date.now()
// }


// setTimeout(() => {
//     console.log('timeout 0 - 1')
// }, 0)

// setTimeout(() => {
//     console.log('timeout 0 - 2')
// }, 0)

// for (let i = 0; i < 10000; i++);

function func() {
    console.log('func start')
    try {
        console.log('hello')
        return console.log('try return statement')
    } finally {
        console.log('finally')
        return 'finally return statement'
    }
}

console.log(func())