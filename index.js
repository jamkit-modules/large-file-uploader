const module = (function() {
    async function _upload_file(path, size, config, callbacks, event_handlers) {
        const default_part_size = config["part_size"] || 8 * 1024 * 1024; // default is 8MB
        var total_uploaded_size = 0, part_number = 1;
    
        while (total_uploaded_size < size) {
            const part_size = (size - total_uploaded_size) < default_part_size ? (size - total_uploaded_size) : default_part_size;
            const [ response, uploaded_size ] = await _upload_file_part(path, part_number, total_uploaded_size, part_size, callbacks, (uploaded_size) => {
                const percent = (total_uploaded_size + uploaded_size) / size * 100;

                if (event_handlers["transfer"]) {
                    event_handlers["transfer"](percent);
                }
            });

            if (event_handlers["upload_part"]) {
                event_handlers["upload_part"](part_number, response);
            }
            
            total_uploaded_size = total_uploaded_size + uploaded_size;
            part_number = part_number + 1;
        }

        return _complete_transfer(callbacks);
    }

    function _upload_file_part(path, part_number, offset, length, callbacks, on_transfer) {
        var uploaded_size = 0;
    
        return _get_upload_url(callbacks, part_number)
            .then(({ url, params }) => {
                return upload(url, "", path, Object.assign(params, {
                    "position": {
                        "offset": offset,
                        "length": length
                    } 
                }), (bytes_written, total_bytes_written) => {
                    on_transfer(uploaded_size = total_bytes_written);
                });
            })
            .then((response) => {
                return [ response, uploaded_size ];
            });
    }

    function _get_upload_url(callbacks, part_number) {
        if (callbacks["prepare_part"]) {
            return callbacks["prepare_part"](part_number);
        }

        return Promise.reject();
    }

    function _complete_transfer(callbacks) {
        if (callbacks["complete"]) {
            return callbacks["complete"]();
        }
        
        return Promise.resolve()
    }
    
    return {
        create: function(config = {}) {
            const _callbacks = {}, _event_handlers = {};

            return {
                upload: function(path, size = 0) {
                    return _upload_file(path, size, config, _callbacks, _event_handlers);
                },

                set_callback: function(type, callback) {
                    _callbacks[type] = callback;

                    return this;
                },

                on: function(event, handler) {
                    _event_handlers[event] = handler;

                    return this;
                },
            }
        },
    }
})();

__MODULE__ = module;
