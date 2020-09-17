/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/log", "N/file", "N/record", "N/search"], function (log, file, record, search) {

    async function onRequest(context) {
        let parameters = context.request.parameters.body || "{}";
        parameters = JSON.parse(parameters);
        let response = context.response;
        response.setHeader({
            name: "Content-Type",
            value: "application/json"
        });
        if (context.request.method != "POST") {
            response.write(JSON.stringify({
                message: "script is working"
            }));
        } else {
            let type = parameters.type;
            let name = parameters.fileName;
            let parent = parameters.folderId;
            let body = {};

            if (type == "file") {
                body.id = file.create({
                    name,
                    fileType: parameters.extension,
                    contents: parameters.contents,
                    folder: parent,
                }).save();
                log.debug({
                    title: "file created " + body.id,
                });
            } else if (type == "folder") {
                let res = await search.create.promise({
                    type: "folder",
                    filters:
                        [
                            ["name", "startswith", name],
                            "AND",
                            ["parent", "anyof", parent]
                        ],
                });
                await res.run().each.promise(
                    function (res, index) {
                        body.id = res.id;
                        log.debug({
                            title: "folder already exists " + body.id,
                        });
                    }
                );
                if (!body.id) {
                    res = await record.create.promise({
                        type: record.Type.FOLDER,
                    });
                    res.setValue({
                        fieldId: "name",
                        value: name
                    });
                    res.setValue({
                        fieldId: "parent",
                        value: parent
                    });
                    body.id = await res.save.promise();
                    log.debug({
                        title: "folder created " + body.id,
                    });
                }
            }
            response.write(JSON.stringify(body));
        }
    }

    return {
        onRequest: onRequest
    };
});

