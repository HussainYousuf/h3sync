/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/log", "N/file", "N/record", "N/search"], function (log, file, record, search) {

    function onRequest(context) {
        try {
            let parameters = context.request.parameters.body || "{}";
            parameters = JSON.parse(parameters);
            let response = context.response;
            response.setHeader({
                name: "Content-Type",
                value: "application/json"
            });
            if (context.request.method == "POST" && ["file", "folder"].includes(parameters.type)) {
                let id;
                if (parameters.type == "file") {
                    id = file.create({
                        name: parameters.name,
                        fileType: parameters.extension,
                        contents: parameters.contents,
                        folder: parameters.parent,
                    }).save();
                } else if (parameters.type == "folder") {
                    search.create({
                        type: "folder",
                        filters:
                            [
                                ["name", "startswith", parameters.name],
                                "AND",
                                ["parent", "is", parameters.parent]
                            ],
                    }).run().each(res => id = res.id);
                    if (!id) {
                        id = record.create({
                            type: record.Type.FOLDER,
                        }).setValue({
                            fieldId: "name",
                            value: parameters.name
                        }).setValue({
                            fieldId: "parent",
                            value: parameters.parent
                        }).save();
                    }
                }
                log.debug({
                    title: parameters.name,
                    details: id
                });
                response.write(JSON.stringify({ id }));
            }
            else {
                response.write(JSON.stringify({ message: "script is working" }));
            }
        } catch (error) {
            log.debug({
                title: "error",
                details: JSON.stringify(error)
            });
        }
    }

    return {
        onRequest: onRequest
    };
});