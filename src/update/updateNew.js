const { writeNextBatch } = require('../entities/helpers');

/** Take an array of petitioners and do all of the look-ups, additions
 * 1. create a DB of {ptabName, cleanName: [], case[{IPR, party}]}
 * 2. now go through each and do the matching algorithm
 * 3. cleanName.concat(matches)
 * 4. Now this can be queried for cleaning purposes
 * Then another function to periodically update if any of the lookups are changed
 * 1. Go through array of lookups
 * 2. Read IPR, party
 * 3. insert ({IPR:}, {[party]:cleanName})
 */
const createLookupCollection = async(db, sourceCollection) => {
    const masterList = await db.collection(sourceCollection).find({}, {IPR: 1, CheckValues:1}).toArray()
    const cleanList = masterList.reduce((accum, item) => {
        // for ['Petitioner', 'PatentOwner'] search accum for this name (item.Petitioner)
        // if name is found, push {item.IPR}

    }, []);
}


/** ImportPTAB takes a collection from the ptab Raw format and maps it to the byTrials collection format
 * input schema {
 *   applicationNumber,
 *   patentNumber,
 *   patentOwnerName,
 *   prosecutionStatus,
 *   filingDate,
 *   petitionerPartyName,
 *   lastModifiedDatetime,
 *   accordedFilingDate,
 *   institutionDecisionDate,
 *   trialNumber,
 *   inventorName,
 *   links: [
 *     {rel, href}
 *   ]
 * }
 * 
 * output schema {
 *   IPR -> trialNumber,
 *   DateFiled -> ISODate(filingDate),
 *   Status -> prosecutionStatus,
 *   FWDStatus,
 *   AllJudges,
 *   AuthorJudge,
 *   Petitioner: [
 *     {type, name -> petitionerPartyName}
 *   ],
 *   PatentOwner: [
 *     {type, name -> patentOwnerName}
 *   ],
 *   PatentNumber -> patentNumber,
 *   CaseLink,
 *   MainUSPC,
 *   ClaimsListed: [],
 *   ClaimsInstituted: [],
 *   ClaimsUnpatentable: [],
 *   InstitutionDate -> ISODate(institutionDecisionDate)
 * }
 * 
 * 
 **/

const importPTAB = async (db, newCollection, data) => {
    const updateRecord = async (record) => await ({
        IPR: record.trialNumber,
        InstitutionDate: (record.InstitutionDate != 'undefined') ? new Date(record.institutionDecisionDate) : 'none',
        DateFiled: new Date(record.filingDate),
        Status: record.prosecutionStatus,
        Petitioner: lookupEntity(db, 'Petitioner', record.petitionerPartyName).matches,
        PatentOwner: 'ok',//await lookupEntity(db, 'PatentOwner', record.patentOwnerName).matches,
        PatentNumber: record.patentNumber,
        CaseLink: record.links.filter(item => item.rel === 'self')[0].href,
        CheckValues: { Petitioner: record.petitionerPartyName, PatentOwner: record.patentOwnerName }
    });

    try {
        return Promise.all(data.map(updateRecord))
            .then(newData => {
                console.log('writing to DB: %j', newData);
                return writeNextBatch(db, newCollection, 0, newData)
            }).then(() => Promise.resolve('done'))
            .catch (err2 => Promise.reject(err2));
    } catch (err) {
    return Promise.reject(err)
};
};

/** lookupEntity searches the collection defined by 'entity' for a close match based on the entity.name
 * and return a match or default ({name: name, type: 'unknown'})
 * @param {mongoDB} db - the active mongodb instance 
 * @param {string} entity - 'Petitioner' or 'PatentOwner' 
 * @param {string} name - the entity name to search for
 * @returns {Object} - {name, type}
 */
const lookupEntity = async (db, entity, name) => {

    /**
     * Recursively look for a match, starting with a 100% match and working down
     * one character at a time. Will return 'noMatch' if less then 3 characters match
     * @param {mongoDb} db 
     * @param {string} entity 
     * @param {string} name 
     * @param {number} matchLength
     * @returns {Promise} resolves to 'noMatch' or {number, matches:[{name, type}]}
     */

    const narrowSearch = async (matchLength) => {
        try {
            if (matchLength <= 3) return Promise.resolve('noMatch'); //minimum of 3 characters must match
            const regex = new RegExp(name.substr(0, matchLength).replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'), 'g');
            console.log('trying regex %s', regex.toString());
            const newMatches = await db.collection(`${entity}s`).find({ name: { $regex: regex } }).toArray();
            console.log('matching %d characters: %d matches found, %j', matchLength, newMatches.length, newMatches);
            if (newMatches.length !== 0) {
                return Promise.resolve(newMatches.map(item => ({ name: item.name, type: item.type })));
            }
            return await narrowSearch(matchLength - 1);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    try {
        console.info('searching for string %s in %ss collection', name, entity);
        let matches = await narrowSearch(name.length);
        if (matches === 'noMatch') {
            return Promise.resolve({ number: 0, matches: [{ name, type: 'unknown' }] });
        }
        return Promise.resolve({ number: matches.length, matches });
    } catch (err) {
        return Promise.reject(err);
    }
}

/** mergeNewRecords compares two collections and returns a list of IPR case numbers
 * that are in the new list but not in the old list.
 * 
 * @param {Object: mongoDB} db 
 * @param {string} inputCollection 
 * @param {string} mainCollection
 * @returns {Promise -> Array<{ IPR:{string} }>}
 */
const mergeNewRecords = (db, inputCollection, mainCollection) => {
    const writeStatus = {};
    return db.collection(inputCollection).find({}).toArray()
        .then(firstResult => db.collection('merge').insert(firstResult.map(item => {
            item.source = 'old';
            return item;
        })))
        .then(() => db.collection(mainCollection).find({}).toArray())
        .then(newResult => db.collection('merge').insert(newResult.map(item => {
            item.source = 'new';
            return item;
        })))
        .then(() => db.collection('merge').aggregate([
            { $project: { IPR: 1, source: 1 } },
            { $group: { _id: "$IPR", matches: { $sum: 1 } } },
            { $match: { matches: 1 } },
            { $project: { IPR: "$_id", _id: 0 } },
            {
                $lookup: {
                    from: "ptabRaw",
                    localField: "IPR",
                    foreignField: "IPR",
                    as: "newRecord"
                }
            },
            { $project: { "newRecord._id": 0 } }
        ]).toArray())
        .then(result => {
            writeStatus.added = result.filter(item => item.newRecord.length !== 0).length;
            if (writeStatus.added > 0) {
                return db.collection('byTrial').insert(
                    result.filter(item => item.newRecord.length !== 0).map(item => item.newRecord[0])
                )
            }
            return;
        })
        .then(() => db.collection('merge').drop())
        .then(result => Promise.resolve(writeStatus))
        .catch(err => Promise.reject(err));
}

/** updateStatus attempts to merge PTAB data into the byTrial collection
 * by inserting a new record, or updating the FWD status in case of new information
 * @param {*} db - mongoDB instance
 * @param {*} updateList - Array of new Objects (from PTAB byTrial collection)
 * @returns {{changes:Array, additions:Array}} - listing of changes and additions made to the main collection 
 */
const updateStatus = async (db, updateList) => {
    try {
        // create sets of the IPR case numbers of the current collection and the updated files, to
        // sets ensure there are no duplicates and support set operations
        const byTrial = await db.collection('byTrial').find({}, { 'IPR': 1, 'FWDStatus': 1 }).toArray();
        const mainCollection = new Set(byTrial.map(item => item.IPR));
        const updateSet = new Set(updateList.map(item => item.IPR));
        // First - generate a list of items where the status has changed
        const intersection = [...updateSet].filter(item => mainCollection.has(item));
        const changes = intersection.reduce((accum, item) => {
            // for each item in the intersection array
            // lookup the old status corresponding to that item value
            const oldStatus = byTrial.filter(x => x.IPR === item);
            const newStatus = updateList.filter(x => x.IPR === item);
            if (oldStatus !== [] && newStatus !== []) {
                accum.push({ IPR: item, Status: newStatus.length > 0 ? newStatus[0].Status : 'unknown' })
            }
            return accum;
        }, []);
        // Second - generate a list of new items not in the existing dataset
        const difference = [...updateSet].filter(item => !mainCollection.has(item))
        const additions = updateList.filter(item => difference.includes(item.IPR)) // TODO add all of the items from 'difference'
        return Promise.resolve({ changes, additions });
    } catch (err) {
        return Promise.reject(err)
    }
}

module.exports = {
    updateStatus,
    mergeNewRecords,
    lookupEntity,
    importPTAB
}