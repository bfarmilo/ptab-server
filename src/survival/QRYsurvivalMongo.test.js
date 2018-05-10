//const { connect } = require('../connect/mongoConnect');
const { binRecord } = require('./QRYsurvivalMongo');

let testRecord = [{
        IPR: "IPR2012-00001",
        DateFiled: "2012-09-16",
        Status: "FWD Entered",
        FWDStatus: "Unpatentable",
        AllJudges: "Jameson Lee;Josiah C Cocks;Michael P Tierney",
        AuthorJudge: "Jameson Lee",
        Petitioner: "Garmin International (company)",
        PatentOwner: "CUOZZO SPEED TECHNOLOGIES (npe)",
        PatentNumber: "6778074",
        CaseLink: "http://www.patexia.com/lawsuits/Garmin-International-Inc-v-Cuozzo-Speed-Technologies-LLC-id-61953",
        MainUSPC: "340",
        ClaimsListed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        ClaimsInstituted: [10, 14, 17],
        ClaimsUnpatentable: [10, 14, 17],
        InstitutionDate: "2013-01-09"
    }, {
        IPR: "IPR2012-00004",
        DateFiled: "2012-09-16",
        Status: "Terminated-Settled",
        FWDStatus: "N/A",
        AllJudges: "Brian J Mcnamara;Thomas L Giannetti;Howard B Blankenship",
        AuthorJudge: "Thomas L Giannetti",
        Petitioner: "MACAUTO USA (company)",
        PatentOwner: "Phenolchemie GmbH & KG (company); BOS GmbH & KG (company)",
        PatentNumber: "6778074",
        CaseLink: "http://www.patexia.com/lawsuits/MACAUTO-USA-v-BOS-GmbH-%26-Co-KG-id-61954",
        MainUSPC: "340",
        ClaimsListed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
        ClaimsInstituted: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
        InstitutionDate: "2013-01-24"
    },
    {
        IPR: "IPR2013-00023",
        DateFiled: "2012-10-17",
        Status: "Terminated-Denied",
        FWDStatus: "N/A",
        AllJudges: "Lora M Green;Michael P Tierney;Sally G Lane",
        AuthorJudge: "Lora M Green",
        Petitioner: "Monsanto (company)",
        PatentOwner: "Roche Diagnostics Operations (lawfirm); Pioneer Hi Bred International (company)",
        PatentNumber: "6162974",
        CaseLink: "http://www.patexia.com/lawsuits/Monsanto-Company-v-Pioneer-Hi-Bred-International-id-61984",
        MainUSPC: "800",
        ClaimsListed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        InstitutionDate: "2013-04-11"
    }, {
        IPR: "IPR2013-00034",
        DateFiled: "2012-10-26",
        Status: "FWD Entered",
        FWDStatus: "Unpatentable",
        AllJudges: "Jameson Lee;Michael W Kim;Josiah C Cocks",
        AuthorJudge: "Michael W Kim",
        Petitioner: "Microstrategy (company)",
        PatentOwner: "Zillow (company)",
        PatentNumber: "7970674",
        CaseLink: "http://www.patexia.com/lawsuits/Microstrategy-Inc-v-Zillow-Inc-id-61992",
        MainUSPC: "705",
        ClaimsListed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
        ClaimsInstituted: [2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
        ClaimsUnpatentable: [2, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 26, 28, 29, 30, 31, 32, 33, 35, 36, 37, 39, 40],
        InstitutionDate: "2013-04-02"
    }];


console.log(testRecord);
//let test = binRecord(record);


/* let db, collection;

connect()
    .then(database => {
        db = database;
        collection = db.collection('ptab')
        return;
    })
    //.then(() => survivalAnalysis(db, { field: 'all', value: '' }))
    //.then(result => console.log(result))
    .then(() => survivalAnalysis(db, { field: 'PatentOwner.type', value: 'npe' }))
    .then(result => console.log(result))
    .then(() => survivalArea(db, {field: 'all', value:'all'}))
    .then(result => console.log(JSON.stringify(result)))
    .then(() => db.close())
    .catch(err => {
        console.error(err);
        db.close();
    })
 */