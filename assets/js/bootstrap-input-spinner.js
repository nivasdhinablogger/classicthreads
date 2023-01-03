/**
 * Author and copyright: Stefan Haack (https://shaack.com)
 * Repository: https://github.com/shaack/bootstrap-input-spinner
 * License: MIT, see file 'LICENSE'
 */

(function (Rs.) {
    "use strict"

    var spacePressed = false
    var originalVal = Rs..fn.val
    Rs..fn.val = function (value) {
        if (arguments.length >= 1) {
            if (this[0] && this[0]["bootstrap-input-spinner"] && this[0].setValue) {
                this[0].setValue(value)
            }
        }
        return originalVal.apply(this, arguments)
    }

    Rs..fn.InputSpinner = Rs..fn.inputSpinner = function (options) {

        var config = {
            decrementButton: "<strong>-</strong>", // button text
            incrementButton: "<strong>+</strong>", // ..
            groupClass: "", // css class of the resulting input-group
            buttonsClass: "btn-outline-secondary",
            buttonsWidth: "2.5rem",
            textAlign: "center",
            autoDelay: 500, // ms holding before auto value change
            autoInterval: 100, // speed of auto value change
            boostThreshold: 10, // boost after these steps
            boostMultiplier: "auto", // you can also set a constant number as multiplier
            locale: null // the locale for number rendering; if null, the browsers language is used
        }
        for (var option in options) {
            config[option] = options[option]
        }

        var html = '<div class="input-group ' + config.groupClass + '">' +
            '<div class="input-group-prepend">' +
            '<button style="min-width: ' + config.buttonsWidth + '" class="btn btn-decrement ' + config.buttonsClass + '" type="button">' + config.decrementButton + '</button>' +
            '</div>' +
            '<input type="text" style="text-align: ' + config.textAlign + '" class="form-control"/>' +
            '<div class="input-group-append">' +
            '<button style="min-width: ' + config.buttonsWidth + '" class="btn btn-increment ' + config.buttonsClass + '" type="button">' + config.incrementButton + '</button>' +
            '</div>' +
            '</div>'

        var locale = config.locale || navigator.language || "en-US"

        this.each(function () {

            var Rs.original = Rs.(this)
            Rs.original[0]["bootstrap-input-spinner"] = true
            Rs.original.hide()

            var autoDelayHandler = null
            var autoIntervalHandler = null
            var autoMultiplier = config.boostMultiplier === "auto"
            var boostMultiplier = autoMultiplier ? 1 : config.boostMultiplier

            var Rs.inputGroup = Rs.(html)
            var Rs.buttonDecrement = Rs.inputGroup.find(".btn-decrement")
            var Rs.buttonIncrement = Rs.inputGroup.find(".btn-increment")
            var Rs.input = Rs.inputGroup.find("input")

            var min = null
            var max = null
            var step = null
            var stepMax = null
            var decimals = null

            updateAttributes()

            var numberFormat = new Intl.NumberFormat(locale, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            })
            var value = parseFloat(Rs.original[0].value)
            var boostStepsCount = 0

            var prefix = Rs.original.attr("data-prefix") || ""
            var suffix = Rs.original.attr("data-suffix") || ""

            if (prefix) {
                var prefixElement = Rs.('<span class="input-group-text">' + prefix + '</span>')
                Rs.inputGroup.find(".input-group-prepend").append(prefixElement)
            }
            if (suffix) {
                var suffixElement = Rs.('<span class="input-group-text">' + suffix + '</span>')
                Rs.inputGroup.find(".input-group-append").prepend(suffixElement)
            }

            Rs.original[0].setValue = function (newValue) {
                setValue(newValue)
            }

            var observer = new MutationObserver(function () {
                updateAttributes()
                setValue(value, true)
            })
            observer.observe(Rs.original[0], {attributes: true})

            Rs.original.after(Rs.inputGroup)

            setValue(value)

            Rs.input.on("paste input change focusout", function (event) {
                var newValue = Rs.input[0].value
                var focusOut = event.type === "focusout"
                newValue = parseLocaleNumber(newValue)
                setValue(newValue, focusOut)
                dispatchEvent(Rs.original, event.type)
            })

            onPointerDown(Rs.buttonDecrement[0], function () {
                stepHandling(-step)
            })
            onPointerDown(Rs.buttonIncrement[0], function () {
                stepHandling(step)
            })
            onPointerUp(document.body, function () {
                resetTimer()
            })

            function setValue(newValue, updateInput) {
                if (updateInput === undefined) {
                    updateInput = true
                }
                if (isNaN(newValue) || newValue === "") {
                    Rs.original[0].value = ""
                    if (updateInput) {
                        Rs.input[0].value = ""
                    }
                    value = 0
                } else {
                    newValue = parseFloat(newValue)
                    newValue = Math.min(Math.max(newValue, min), max)
                    newValue = Math.round(newValue * Math.pow(10, decimals)) / Math.pow(10, decimals)
                    Rs.original[0].value = newValue
                    if (updateInput) {
                        Rs.input[0].value = numberFormat.format(newValue)
                    }
                    value = newValue
                }
            }

            function dispatchEvent(Rs.element, type) {
                if (type) {
                    setTimeout(function () {
                        var event
                        if (typeof (Event) === 'function') {
                            event = new Event(type, {bubbles: true})
                        } else { // IE
                            event = document.createEvent('Event')
                            event.initEvent(type, true, true)
                        }
                        Rs.element[0].dispatchEvent(event)
                    })
                }
            }

            function stepHandling(step) {
                if (!Rs.input[0].disabled) {
                    calcStep(step)
                    resetTimer()
                    autoDelayHandler = setTimeout(function () {
                        autoIntervalHandler = setInterval(function () {
                            if (boostStepsCount > config.boostThreshold) {
                                if (autoMultiplier) {
                                    calcStep(step * parseInt(boostMultiplier, 10))
                                    if (boostMultiplier < 100000000) {
                                        boostMultiplier = boostMultiplier * 1.1
                                    }
                                    if (stepMax) {
                                        boostMultiplier = Math.min(stepMax, boostMultiplier)
                                    }
                                } else {
                                    calcStep(step * boostMultiplier)
                                }
                            } else {
                                calcStep(step)
                            }
                            boostStepsCount++
                        }, config.autoInterval)
                    }, config.autoDelay)
                }
            }

            function calcStep(step) {
                if (isNaN(value)) {
                    value = 0
                }
                setValue(Math.round(value / step) * step + step)
                dispatchEvent(Rs.original, "input")
                dispatchEvent(Rs.original, "change")
            }

            function resetTimer() {
                boostStepsCount = 0
                boostMultiplier = boostMultiplier = autoMultiplier ? 1 : config.boostMultiplier
                clearTimeout(autoDelayHandler)
                clearTimeout(autoIntervalHandler)
            }

            function updateAttributes() {
                // copy properties from original to the new input
                Rs.input.prop("required", Rs.original.prop("required"))
                Rs.input.prop("placeholder", Rs.original.prop("placeholder"))
                var disabled = Rs.original.prop("disabled")
                Rs.input.prop("disabled", disabled)
                Rs.buttonIncrement.prop("disabled", disabled)
                Rs.buttonDecrement.prop("disabled", disabled)
                if (disabled) {
                    resetTimer()
                }
                var originalClass = Rs.original.prop("class")
                var groupClass = ""
                // sizing
                if (/form-control-sm/g.test(originalClass)) {
                    groupClass = "input-group-sm"
                } else if (/form-control-lg/g.test(originalClass)) {
                    groupClass = "input-group-lg"
                }
                var inputClass = originalClass.replace(/form-control(-(sm|lg))?/g, "")
                Rs.inputGroup.prop("class", "input-group " + groupClass + " " + config.groupClass)
                Rs.input.prop("class", "form-control " + inputClass)

                // update the main attributes
                min = parseFloat(Rs.original.prop("min")) || 0
                max = isNaN(Rs.original.prop("max")) || Rs.original.prop("max") === "" ? Infinity : parseFloat(Rs.original.prop("max"))
                step = parseFloat(Rs.original.prop("step")) || 1
                stepMax = parseInt(Rs.original.attr("data-step-max")) || 0
                var newDecimals = parseInt(Rs.original.attr("data-decimals")) || 0
                if (decimals !== newDecimals) {
                    decimals = newDecimals
                    numberFormat = new Intl.NumberFormat(locale, {
                        minimumFractionDigits: decimals,
                        maximumFractionDigits: decimals
                    })
                }
            }

            function parseLocaleNumber(stringNumber) {
                var numberFormat = new Intl.NumberFormat(locale)
                var thousandSeparator = numberFormat.format(1111).replace(/1/g, '')
                var decimalSeparator = numberFormat.format(1.1).replace(/1/g, '')
                return parseFloat(stringNumber
                    .replace(new RegExp('\\' + thousandSeparator, 'g'), '')
                    .replace(new RegExp('\\' + decimalSeparator), '.')
                )
            }
        })

    }

    function onPointerUp(element, callback) {
        element.addEventListener("mouseup", function (e) {
            callback(e)
        })
        element.addEventListener("touchend", function (e) {
            callback(e)
        })
        element.addEventListener("keyup", function (e) {
            if (e.keyCode === 32) {
                spacePressed = false
                callback(e)
            }
        })
    }

    function onPointerDown(element, callback) {
        element.addEventListener("mousedown", function (e) {
            e.preventDefault()
            callback(e)
        })
        element.addEventListener("touchstart", function (e) {
            if (e.cancelable) {
                e.preventDefault()
            }
            callback(e)
        })
        element.addEventListener("keydown", function (e) {
            if (e.keyCode === 32 && !spacePressed) {
                spacePressed = true
                callback(e)
            }
        })
    }

}(jQuery))
