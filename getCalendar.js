const fetch = require('node-fetch');
// const { db } = require('./storeData');
const { sendEmail } = require('./sendMail');

const districts = [
    {
        name: 'Gurgaon',
        id: 188,
    },
    {
        name: 'South Delhi',
        id: 149,
    },
    {
        name: 'South East Delhi',
        id: 144,
    },
    {
        name: 'South West Delhi',
        id: 150,
    },
    {
        name: 'Central Delhi',
        id: 141,
    },
    {
        name: 'New Delhi',
        id: 140,
    },
    {
        name: 'Gautam Buddha Nagar',
        id: 650
    }
];

const weeks = 4;
const ageLimit = 40;

const zeroPad = (num) => {
    if (num < 10) return "0" + num.toString();
    return num.toString();
}

const getURL = (districtId, date = new Date()) => {
    const day = zeroPad(date.getDate());
    const month = zeroPad(date.getMonth() + 1);
    const year = date.getFullYear();
    return `https://cdn-api.co-vin.in/api/v2/appointment/sessions/calendarByDistrict?district_id=${districtId}&date=${day}-${month}-${year}`
}

const sendResults = (availabilities) => {
    if(availabilities.length === 0) {
        const thisTime = new Date();
        const timeString = thisTime.toDateString() + ", " + thisTime.toTimeString(); 
        console.log("- No slots found anywhere - last updated " + timeString);
    } else {
        let district = "";
        let center = "";
        let mailString = "";
        for (const availability of availabilities) {
            if (district !== availability.center.district_name) {
                district = availability.center.district_name;
                const distString = `➔ District: ${availability.center.district_name}`
                console.log(distString);
                mailString += (distString + "\n");
            }
            if (center !== availability.center.name) {
                center = availability.center.name;
                const centerString = `\t➔ Center: ${availability.center.name} (${availability.center.pincode})`;
                console.log(centerString);
                mailString += (centerString + "\n");
            }
            const sessionString = `\t\t➔ ${availability.session.available_capacity} slots available on ${availability.session.date} for ${availability.session.vaccine ? availability.session.vaccine : 'Unspecified vaccine'}`;
            console.log(sessionString);
            mailString += (sessionString + "\n");
        };
        console.log("");
        if(process.env.sendMail === "true") sendEmail({
            subject: `Cowin slot availability for 18+ for the next ${weeks} weeks`,
            text: mailString,
            to: process.env.recipients,
            from: process.env.gmailId
        });
    }
}

const processResults = (rawResults) => {
    const availabilities = [];
    for(var i=0; i<rawResults.length; i++) {
        const results = rawResults[i].data;
        if (!('centers' in results) || results.centers.length === 0) continue; //console.log(`  - No centers found for ${district.name} in week starting ${thisDate.toDateString()}`);
        for (var centerCounter = 0; centerCounter < results.centers.length; centerCounter++) {
            const thisCenter = results.centers[centerCounter];
            if (!('sessions' in thisCenter) || thisCenter.sessions.length === 0) continue;
            for (var sessionCounter = 0; sessionCounter < thisCenter.sessions.length; sessionCounter++) {
                const thisSession = thisCenter.sessions[sessionCounter];
                if (thisSession.min_age_limit < ageLimit && thisSession.available_capacity > 0) {
                    availabilities.push({ center: thisCenter, session: thisSession});
                }
            }
        }
    }

    sendResults(availabilities);
}

const fetchDetails = async () => {
    const requestHeaders = {
        method: "GET",
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.5",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Host": "cdn-api.co-vin.in",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
            // "Authorization": "Bearer " + process.env.token,
            // "Origin": "https://selfregistration.cowin.gov.in",
            // "Referer": "https://selfregistration.cowin.gov.in/",
            // "TE": "Trailers",
            "Connection": "keep-alive"
        }
    }

    let results = [];

    for (const district of districts) {
        let thisDate = new Date();
        for(var i=0; i<weeks; i++) {
            console.log(`- Fetching details for ${district.name} for date ${thisDate.toDateString()}`);
            try {
                const serverResults = await fetch(getURL(district.id, thisDate), requestHeaders);
                console.log(`- Details received for ${district.name} for date ${thisDate.toDateString()}`);
                const text = await serverResults.text();
                const data = text && JSON.parse(text);
                results.push({ data: data, date: thisDate });
            } catch(error) {
                if(error instanceof SyntaxError) {
                    console.log(`- Unable to parse results for ${district.name} for date ${thisDate.toDateString()}`)
                } else {
                    console.log(`- Unable to get results for ${district.name} for date ${thisDate.toDateString()}`);
                }
            }
            thisDate.setDate(thisDate.getDate() + 7);
            //sleeping for 5 seconds to be nice to server
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    processResults(results);
}

module.exports = {
    getCalendar: async function() {
        fetchDetails().then().catch(console.log);
    }
}
