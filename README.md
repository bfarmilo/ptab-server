# PTAB Server

An API endpoint which acts as middleware between a MongoDB store of PTAB IPR data (with a Redis cache) and the ptab-analysis client.

## Table of Contents

- [ToDo](#todo)

## Endpoints

- `/run`: gets the table, takes user (number), 
- `/tables` user => array of searchable tables
- `/fields` user => array of searchable fields
- `/survival` user, table, chart =>
- `/connect` user, db ('local' or 'azure') => result of a client.info call
- `/reset` user => 'ok'
- `/multiedit` -- not enabled
- `/survivaldetail` user, table, cursor => 

### ToDo

- Improve error notifications
- update logging
- implement table sort-by !
- migrate queries to new document structure !!
- pull data from PTAB swagger API
 - roughly: get all trials where modified date > last download
 - (iterate through those if required since they only come down 100 at a time)
 - update case status (patent-level) for any overlaps
 - scan for any new parties
 - flag parties where type is not known for update (npe, company, etc.)
 - pull down 'petition', 'institution decision', 'final written decision' pdf documents
 - parse conclusions to get list of claims and their status
 - update/add to the main collection
 - write to JSON file on disk
 - initDB