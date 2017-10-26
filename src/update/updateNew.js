

const updateStatus = (db, updateList) => {
    return db.collection('ptab').aggregate([
        { $project: {'IPR':1, 'Status':1}},
        { $group: {_id: '$IPR', Status: {$addToSet: '$Status'}}}
    ]).toArray()
    .then(result => {
    const updateSet = new Set(updateList.map(item => item.IPR));
    const resultSet = new Set(result.map(item => item._id));
    // First - generate a list of items where the status has changed
    const intersection = [...updateSet].filter(item => resultSet.has(item));
    const changes = intersection.reduce((accum, item) => {
        // lookup the old status corresponding to that item value
        const oldStatus = result.filter(x => x._id===item);
        const newStatus = updateList.filter(x => x.IPR===item);
        if (oldStatus !== [] && newStatus !== []) {
            accum.push({IPR:item, Status:newStatus.length > 0 ? newStatus[0].Status : 'unknown'})
        }
        return accum;
        },[]);
    // Second - generate a list of new items not in the existing dataset
    const difference = [...updateSet].filter(item => !resultSet.has(item))
    const additions = [] // TODO add all of the items from 'difference'
    return Promise.resolve({changes, additions});
    })
    .catch(err => Promise.reject(err))
}

module.exports = {
    updateStatus
}