const timeout = (waitingTime) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('success')
    }, waitingTime)
  })
}

let count = 12;

const start = async () => {
  for (let index = 0; index < count; index++) {
    await timeout(7000)
    const durationBar = document.getElementsByClassName('shaka-current-time')
    let durationMinute;
    const nextBtn = document.getElementsByClassName('next-button')[0]

    if (durationBar.length) {
      durationMinute = +durationBar[0].textContent.split(' / ')[1].split(':')[0]
      // convert minute to millisecond
      durationMinute = durationMinute * 60000
      await timeout(durationMinute)
      console.log('Timed out from block');
      nextBtn.click()

    } else {
      nextBtn.click()
    }
  }
}

start()







